"""Download selected web photographs verbatim; never crop, recolor or generate variants."""
import concurrent.futures, hashlib, io, json, sys, urllib.request
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = root / 'lib' / 'photo-sources.json'
entries = json.loads(manifest.read_text())
folder = root / 'public' / 'images' / 'web-menu'
folder.mkdir(parents=True, exist_ok=True)
def download(entry):
    id = entry['id']
    if len(sys.argv)>1 and id not in sys.argv[1:]: return entry
    try:
        request = urllib.request.Request(entry['url'], headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=35) as response:
            data = response.read(12_000_001)
        if len(data)>12_000_000: raise ValueError('image exceeds 12 MB')
        with Image.open(io.BytesIO(data)) as im:
            width,height = im.size
            if min(width,height)<160: raise ValueError('image too small')
            fmt = im.format.lower()
            im.verify()
        path=folder/(id+'.'+('jpg' if fmt=='jpeg' else fmt))
        path.write_bytes(data)
        entry.update(path='/images/web-menu/'+path.name,sha256=hashlib.sha256(data).hexdigest(),width=width,height=height)
        entry.pop('error',None)
        print(id+' OK',flush=True)
    except Exception as error:
        entry['error']=str(error)
        print(id+' FAILED '+str(error),flush=True)
    return entry
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    entries=list(pool.map(download,entries))
manifest.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'saved':sum('path' in e for e in entries),'failed':[e['id'] for e in entries if 'error' in e]}))
