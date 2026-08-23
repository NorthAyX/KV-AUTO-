#!/usr/bin/env python3
"""
KNAUTO — Real Backend Server (Flask + JWT)
"""

import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import bcrypt
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

SECRET = os.environ.get('JWT_SECRET', 'knauto_secret_key_2026_demo')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
RESEND_FROM = os.environ.get('RESEND_FROM', 'KNAUTO <beth.t@example.com>')
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'db.json')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def load_db():
    if not os.path.exists(DB_PATH):
        admin_pw = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
        user_pw = bcrypt.hashpw(b'user123', bcrypt.gensalt()).decode()
        initial = {
            'users': [
                {
                    'id': 'u-admin',
                    'name': 'Admin KNAUTO',
                    'email': 'admin@knauto.fr',
                    'password': admin_pw,
                    'role': 'admin',
                    'verified': True,
                    'createdAt': datetime.now(timezone.utc).isoformat()
                },
                {
                    'id': 'u-user',
                    'name': 'Utilisateur Demo',
                    'email': 'user@knauto.fr',
                    'password': user_pw,
                    'role': 'user',
                    'verified': True,
                    'createdAt': datetime.now(timezone.utc).isoformat()
                }
            ],
            'cars': [
                {'id': 'c1', 'name': 'KNAUTO Phantom Noir', 'price': 189000, 'category': 'luxe', 'specs': 'V12 biturbo · 750 ch', 'image': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80', 'desc': 'Élégance pure', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c2', 'name': 'KNAUTO Velocity GT', 'price': 162000, 'category': 'sport', 'specs': 'V8 · 620 ch', 'image': 'https://images.unsplash.com/photo-1542362567-b07e543b8bbc?auto=format&fit=crop&w=1200&q=80', 'desc': 'Sportivité raffinée', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c3', 'name': 'KNAUTO Élégance S', 'price': 138500, 'category': 'luxe', 'specs': 'V6 · 510 ch', 'image': 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80', 'desc': 'Confort absolu', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c4', 'name': 'KNAUTO Raptor', 'price': 175000, 'category': 'sport', 'specs': 'V8 · 680 ch · Coupé', 'image': 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80', 'desc': 'Puissance pure', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c5', 'name': 'KNAUTO Sovereign', 'price': 215000, 'category': 'luxe', 'specs': 'V12 · 590 ch · Berline', 'image': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80', 'desc': 'Luxe absolu', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c6', 'name': 'KNAUTO Atlas', 'price': 148000, 'category': 'suv', 'specs': 'V8 · 550 ch · SUV', 'image': 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80', 'desc': 'SUV premium', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c7', 'name': 'KNAUTO Impulse', 'price': 119500, 'category': 'sport', 'specs': 'V6 biturbo · 480 ch', 'image': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', 'desc': 'Dynamisme', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
                {'id': 'c8', 'name': 'KNAUTO Horizon', 'price': 132000, 'category': 'suv', 'specs': 'Électrique · 580 ch · SUV', 'image': 'https://images.unsplash.com/photo-1606664515524-ed2f786a3bd6?auto=format&fit=crop&w=800&q=80', 'desc': 'Électrique premium', 'ownerId': 'u-admin', 'ownerName': 'Admin KNAUTO', 'createdAt': datetime.now(timezone.utc).isoformat()},
            ],
            'requests': []
        }
        save_db(initial)
        return initial
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_db(db):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

def send_verification_email(to_email, name, verify_url):
    """Envoie l'email de verification via Resend."""
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8f7ff;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:22px;font-weight:800;letter-spacing:0.15em;color:#6260FF">KNAUTO</span>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 4px 20px rgba(98,96,255,0.08)">
        <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 12px">Bonjour {name},</h2>
        <p style="color:#6b6b8a;line-height:1.6;margin:0 0 20px">
          Merci de vous etre inscrit sur KNAUTO. Cliquez sur le bouton ci-dessous pour activer votre compte.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="{verify_url}"
             style="display:inline-block;background:#6260FF;color:#fff;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:15px">
            Activer mon compte
          </a>
        </div>
        <p style="color:#9a9ab0;font-size:13px;line-height:1.5;margin:0">
          Ce lien expire dans 24 heures.<br>
          Si vous n avez pas cree de compte, ignorez cet email.
        </p>
      </div>
      <p style="text-align:center;color:#9a9ab0;font-size:12px;margin-top:20px">KNAUTO — L excellence automobile</p>
    </div>
    """
    try:
        resp = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'from': RESEND_FROM,
                'to': [to_email],
                'subject': 'Activez votre compte KNAUTO',
                'html': html
            },
            timeout=15
        )
        if resp.status_code in (200, 201):
            print(f"  >>> Email envoye a {to_email}")
            return True, None
        else:
            err = resp.text
            print(f"  >>> Erreur Resend ({resp.status_code}): {err}")
            return False, err
    except Exception as e:
        print(f"  >>> Exception envoi email: {e}")
        return False, str(e)



def create_token(user):
    payload = {
        'id': user['id'],
        'email': user['email'],
        'name': user['name'],
        'role': user['role'],
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET, algorithm='HS256')


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        try:
            payload = jwt.decode(header[7:], SECRET, algorithms=['HS256'])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @auth_required
    def decorated(*args, **kwargs):
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Accès réservé aux administrateurs'}), 403
        return f(*args, **kwargs)
    return decorated


# ---------- AUTH ----------
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not name or not email or len(password) < 6:
        return jsonify({'error': 'Donnees invalides (mot de passe min. 6 caracteres)'}), 400
    db = load_db()
    if any(u['email'] == email for u in db['users']):
        return jsonify({'error': 'Cet email est deja utilise'}), 409

    verify_token = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
    user = {
        'id': str(uuid.uuid4()),
        'name': name,
        'email': email,
        'password': bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
        'role': 'user',
        'verified': False,
        'verificationToken': verify_token,
        'verificationExpires': (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    db['users'].append(user)
    save_db(db)

    base = request.host_url.rstrip('/')
    verify_url = f"{base}/api/auth/verify/{verify_token}"

    sent, err = send_verification_email(email, name, verify_url)
    print(f"\n  >>> VERIFICATION pour {email}")
    print(f"  >>> Lien : {verify_url}")
    print(f"  >>> Email envoye : {sent}\n")

    return jsonify({
        'message': 'Compte cree. Verifiez votre email pour activer le compte.',
        'requiresVerification': True,
        'emailSent': sent,
        'verifyUrl': verify_url,  # garde en demo si email echoue
        'email': email,
        'emailError': err if not sent else None
    }), 201



@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    db = load_db()
    user = next((u for u in db['users'] if u['email'] == email), None)
    if not user or not bcrypt.checkpw(password.encode(), user['password'].encode()):
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401
    if not user.get('verified', True):
        return jsonify({
            'error': 'Compte non verifie. Consultez votre email pour activer le compte.',
            'requiresVerification': True,
            'email': email
        }), 403
    token = create_token(user)
    return jsonify({
        'token': token,
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}
    })




@app.route('/api/auth/verify/<token>', methods=['GET'])
def verify_email(token):
    db = load_db()
    user = next((u for u in db['users'] if u.get('verificationToken') == token), None)
    if not user:
        return jsonify({'error': 'Lien de verification invalide ou expire'}), 400
    expires = user.get('verificationExpires')
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > exp_dt:
                return jsonify({'error': 'Le lien de verification a expire'}), 400
        except Exception:
            pass
    user['verified'] = True
    user.pop('verificationToken', None)
    user.pop('verificationExpires', None)
    save_db(db)
    html = """<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Compte verifie - KNAUTO</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#E4E4FF;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;padding:2.5rem;border-radius:16px;text-align:center;box-shadow:0 10px 40px rgba(98,96,255,.15);max-width:420px}
h1{color:#6260FF;font-size:1.5rem;margin-bottom:.5rem}
p{color:#6b6b8a}
a{display:inline-block;margin-top:1.5rem;background:#6260FF;color:#fff;padding:.8rem 1.6rem;border-radius:50px;text-decoration:none;font-weight:600}
</style></head>
<body><div class="box">
<h1>Compte verifie</h1>
<p>Votre compte est maintenant actif. Vous pouvez vous connecter.</p>
<a href="/">Retour a KNAUTO</a>
</div></body></html>"""
    return html


@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email requis'}), 400
    db = load_db()
    user = next((u for u in db['users'] if u['email'] == email), None)
    if not user:
        return jsonify({'error': 'Aucun compte trouve'}), 404
    if user.get('verified', True):
        return jsonify({'error': 'Ce compte est deja verifie'}), 400
    verify_token = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
    user['verificationToken'] = verify_token
    user['verificationExpires'] = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    save_db(db)
    base = request.host_url.rstrip('/')
    verify_url = f"{base}/api/auth/verify/{verify_token}"
    sent, err = send_verification_email(email, user.get('name', ''), verify_url)
    print(f"\n  >>> RESEND pour {email}\n  >>> Lien : {verify_url}\n  >>> Email: {sent}\n")
    return jsonify({
        'message': 'Nouveau lien genere.',
        'emailSent': sent,
        'verifyUrl': verify_url,
        'emailError': err if not sent else None
    })


@app.route('/api/auth/me', methods=['GET'])
@auth_required
def me():
    db = load_db()
    user = next((u for u in db['users'] if u['id'] == request.user['id']), None)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
    return jsonify({'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']})


# ---------- CARS ----------
@app.route('/api/cars', methods=['GET'])
def list_cars():
    db = load_db()
    category = request.args.get('category')
    cars = db['cars']
    if category and category != 'all':
        cars = [c for c in cars if c['category'] == category]
    return jsonify(cars)


@app.route('/api/cars/<car_id>', methods=['GET'])
def get_car(car_id):
    db = load_db()
    car = next((c for c in db['cars'] if c['id'] == car_id), None)
    if not car:
        return jsonify({'error': 'Véhicule introuvable'}), 404
    return jsonify(car)


@app.route('/api/cars', methods=['POST'])
@auth_required
def create_car():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    price = data.get('price')
    category = data.get('category')
    specs = (data.get('specs') or '').strip()
    if not name or not price or not category or not specs:
        return jsonify({'error': 'Champs obligatoires manquants'}), 400
    db = load_db()
    car = {
        'id': str(uuid.uuid4()),
        'name': name,
        'price': int(price),
        'category': category,
        'specs': specs,
        'image': (data.get('image') or '').strip() or 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80',
        'desc': (data.get('desc') or '').strip(),
        'ownerId': request.user['id'],
        'ownerName': request.user['name'],
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    db['cars'].insert(0, car)
    save_db(db)
    return jsonify(car), 201


@app.route('/api/cars/<car_id>', methods=['DELETE'])
@auth_required
def delete_car(car_id):
    db = load_db()
    car = next((c for c in db['cars'] if c['id'] == car_id), None)
    if not car:
        return jsonify({'error': 'Véhicule introuvable'}), 404
    if request.user['role'] != 'admin' and car['ownerId'] != request.user['id']:
        return jsonify({'error': 'Vous ne pouvez supprimer que vos propres annonces'}), 403
    db['cars'] = [c for c in db['cars'] if c['id'] != car_id]
    save_db(db)
    return jsonify({'success': True, 'message': 'Véhicule supprimé'})


# ---------- REQUESTS ----------
@app.route('/api/requests', methods=['POST'])
@auth_required
def create_request():
    data = request.get_json() or {}
    car_id = data.get('carId')
    car_name = data.get('carName')
    req_type = data.get('type')
    if not car_id or not car_name or not req_type:
        return jsonify({'error': 'Données manquantes'}), 400
    db = load_db()
    req = {
        'id': str(uuid.uuid4()),
        'carId': car_id,
        'carName': car_name,
        'userId': request.user['id'],
        'userName': request.user['name'],
        'userEmail': request.user['email'],
        'phone': data.get('phone') or '',
        'type': req_type,
        'message': data.get('message') or '',
        'status': 'pending',
        'createdAt': datetime.now(timezone.utc).isoformat()
    }
    db['requests'].insert(0, req)
    save_db(db)
    return jsonify(req), 201


@app.route('/api/requests/me', methods=['GET'])
@auth_required
def my_requests():
    db = load_db()
    mine = [r for r in db['requests'] if r['userId'] == request.user['id']]
    return jsonify(mine)


@app.route('/api/requests', methods=['GET'])
@admin_required
def all_requests():
    db = load_db()
    return jsonify(db['requests'])


# ---------- USERS & STATS (admin) ----------
@app.route('/api/users', methods=['GET'])
@admin_required
def list_users():
    db = load_db()
    safe = [{'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'], 'createdAt': u.get('createdAt')} for u in db['users']]
    return jsonify(safe)


@app.route('/api/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    db = load_db()
    user = next((u for u in db['users'] if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404
    if user['role'] == 'admin':
        return jsonify({'error': 'Impossible de supprimer un admin'}), 403
    db['users'] = [u for u in db['users'] if u['id'] != user_id]
    save_db(db)
    return jsonify({'success': True})


@app.route('/api/stats', methods=['GET'])
@admin_required
def stats():
    db = load_db()
    return jsonify({
        'cars': len(db['cars']),
        'users': len(db['users']),
        'requests': len(db['requests'])
    })


# ---------- STATIC / SPA ----------
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def static_proxy(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    print('\n  KNAUTO Server running at http://localhost:3000')
    print('  Admin : admin@knauto.fr / admin123')
    print('  User  : user@knauto.fr  / user123\n')
    app.run(host='0.0.0.0', port=3000, debug=False)
