import json, re, uuid, urllib.request, urllib.error, http.cookiejar
from pathlib import Path
base='https://layl-menu.netlify.app'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(path, method='GET', body=None):
    request=urllib.request.Request(base+'/api/'+path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type':'application/json','Origin':base})
    try:
        with opener.open(request, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(str(error.code)+': '+error.read().decode()) from None
password=re.search(r'^STAFF_PASSWORD=(.*)$',Path('.env').read_text(),re.M).group(1).strip().strip('\"\'')
assert call('session','POST',{'password':password})['authenticated']
print('Staff login passed',flush=True)
order={'id':str(uuid.uuid4()),'token':str(uuid.uuid4()),'tableNumber':1,'items':[{'id':'m0-0','quantity':1,'note':''}],'note':'فحص النشر'}
result=call('orders','POST',order)
assert result['total']==17
assert any(row['id']==order['id'] for row in call('staff')['orders'])
assert call('staff','PATCH',{'id':order['id'],'from':'new','status':'cancelled'})['ok']
assert call('orders?id='+order['id']+'&token='+order['token'])['status']=='cancelled'
print('Live order creation, staff listing, status update and customer tracking passed. Test order cancelled.',flush=True)
