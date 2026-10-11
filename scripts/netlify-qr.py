from pathlib import Path
import qrcode

root = Path(__file__).resolve().parents[1] / 'public' / 'qr'
root.mkdir(exist_ok=True)
for table in range(1, 21):
    qrcode.make(f'https://layl-menu.netlify.app/menu?table={table}').save(root / f'{table}.png')

