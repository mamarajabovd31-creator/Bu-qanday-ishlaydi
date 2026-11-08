#!/usr/bin/env python3
"""Telegram kanalga post yuborish (GitHub Actions ichida ishlaydi).

Foydalanish:
  python3 tg_post.py telegram/posts/2026-11-09-bankomat.json   # postni yuborish
  python3 tg_post.py --check                                    # bot va kanalni tekshirish (hech narsa yubormaydi)

Kerakli muhit o'zgaruvchilari:
  TELEGRAM_BOT_TOKEN  - BotFather bergan token (GitHub Secrets'da saqlanadi)
  TELEGRAM_CHAT_ID    - kanal, masalan @buqanday_ishlaydi1 (bo'sh bo'lsa shu ishlatiladi)
"""
import json, os, subprocess, sys

TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
CHAT = (os.environ.get('TELEGRAM_CHAT_ID') or '@buqanday_ishlaydi1').strip()
API = os.environ.get('TG_API', 'https://api.telegram.org').rstrip('/')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CAPTION_MAX, TEXT_MAX = 1024, 4096


def fail(msg):
    print(f'::error::{msg}')
    sys.exit(1)


def call(method, fields=None, files=None):
    """Bot API chaqiruvi. Matnlar --form-string bilan yuboriladi, shuning uchun
    '@' yoki '<' bilan boshlanadigan matn fayl deb tushunilmaydi."""
    cmd = ['curl', '-sS', '-m', '600', f'{API}/bot{TOKEN}/{method}']
    for k, v in (fields or {}).items():
        if v is None:
            continue
        cmd += ['--form-string', f'{k}={v}']
    for k, path in (files or {}).items():
        cmd += ['-F', f'{k}=@{path}']
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(r.stdout)
    except Exception:
        fail(f'{method}: javob o\'qilmadi ({r.stderr.strip() or r.stdout[:200]})')
    if not data.get('ok'):
        fail(f"{method}: {data.get('error_code')} {data.get('description')}")
    return data['result']


def check():
    me = call('getMe')
    print(f"Bot: @{me['username']} (id {me['id']})")
    chat = call('getChat', {'chat_id': CHAT})
    print(f"Kanal: {chat.get('title')} ({chat.get('username') and '@' + chat['username'] or chat['id']})")
    m = call('getChatMember', {'chat_id': CHAT, 'user_id': me['id']})
    st = m.get('status')
    can = m.get('can_post_messages')
    print(f'Botning kanaldagi holati: {st}, post joylay oladimi: {can}')
    if st != 'administrator' or not can:
        fail('Bot kanalda "Xabar joylash" huquqi bilan admin emas.')
    print('Hammasi tayyor: bot kanalga post joylay oladi.')


def media_path(rel):
    p = os.path.normpath(os.path.join(ROOT, rel))
    if not p.startswith(ROOT + os.sep) or not os.path.isfile(p):
        fail(f'Fayl topilmadi: {rel}')
    if os.path.getsize(p) > 50 * 1024 * 1024:
        fail(f'{rel} 50 MB dan katta, bot bunday faylni yubora olmaydi.')
    return p


def post(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        p = json.load(f)
    text = p.get('text', '').strip()
    media = None
    for kind in ('video', 'photo', 'document'):
        if p.get(kind):
            media = kind
            break
    limit = CAPTION_MAX if media else TEXT_MAX
    if not text and not media:
        fail(f'{path}: na matn, na fayl bor.')
    if len(text) > limit:
        fail(f'{path}: matn {len(text)} belgi, chegarasi {limit}.')

    fields = {
        'chat_id': CHAT,
        'parse_mode': p.get('parse_mode', 'HTML'),
        'disable_notification': 'true' if p.get('silent') else None,
    }
    if p.get('buttons'):
        fields['reply_markup'] = json.dumps({'inline_keyboard': p['buttons']}, ensure_ascii=False)

    files = {}
    if media:
        fields['caption'] = text or None
        files[media] = media_path(p[media])
        if media == 'video':
            fields['supports_streaming'] = 'true'
            if p.get('thumbnail'):
                files['thumbnail'] = media_path(p['thumbnail'])
            for k in ('width', 'height', 'duration'):
                if p.get(k):
                    fields[k] = str(p[k])
        method = {'video': 'sendVideo', 'photo': 'sendPhoto', 'document': 'sendDocument'}[media]
    else:
        fields['text'] = text
        fields['link_preview_options'] = json.dumps({'is_disabled': not p.get('preview', False)})
        method = 'sendMessage'

    msg = call(method, fields, files)
    chat = msg.get('chat', {})
    link = f"https://t.me/{chat['username']}/{msg['message_id']}" if chat.get('username') else f"id {msg['message_id']}"
    print(f'Joylandi: {path} -> {link}')


if __name__ == '__main__':
    if not TOKEN:
        fail('TELEGRAM_BOT_TOKEN topilmadi. Uni GitHub repo Settings > Secrets and variables > Actions ga qo\'shing.')
    args = sys.argv[1:]
    if not args:
        fail('Post fayli ko\'rsatilmadi.')
    if args == ['--check']:
        check()
    else:
        for a in args:
            post(a)
