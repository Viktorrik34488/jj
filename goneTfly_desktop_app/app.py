from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ваш-секретный-ключ'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Модель пользователя
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))

# Модель бронирования
class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    airline = db.Column(db.String(100), nullable=False)
    origin = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    depart_date = db.Column(db.String(20), nullable=False)
    return_date = db.Column(db.String(20))
    price = db.Column(db.Integer, nullable=False)
    passengers = db.Column(db.Integer, nullable=False)
    booking_reference = db.Column(db.String(20), unique=True, nullable=False)
    status = db.Column(db.String(20), default='confirmed')

# Создание таблиц
with app.app_context():
    db.create_all()

# Jinja2 фильтр для форматирования цены
@app.template_filter('format_price')
def format_price_filter(price):
    try:
        return "{:,}".format(int(price)).replace(",", " ")
    except (ValueError, TypeError):
        return str(price)

# Главная страница - поиск
@app.route('/')
def index():
    return render_template('index.html')

# Страница входа
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['user_email'] = user.email
            session['user_name'] = f"{user.first_name} {user.last_name}"
            return jsonify({'status': 'success', 'message': 'Вход выполнен успешно!'})
        else:
            return jsonify({'status': 'error', 'message': 'Неверный email или пароль'})
    
    return render_template('login.html')

# Страница регистрации
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        phone = request.form.get('phone')
        
        # Проверка существования пользователя
        if User.query.filter_by(email=email).first():
            return jsonify({'status': 'error', 'message': 'Пользователь с таким email уже существует'})
        
        # Создание нового пользователя
        new_user = User(
            email=email,
            password_hash=generate_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'status': 'success', 'message': 'Регистрация прошла успешно! Теперь вы можете войти.'})
    
    return render_template('register.html')

# Выход
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# Страница моих бронирований
@app.route('/my_bookings')
def my_bookings():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_bookings = Booking.query.filter_by(user_id=session['user_id']).all()
    return render_template('my_bookings.html', bookings=user_bookings)

# Страница результатов поиска
@app.route('/search', methods=['POST'])
def search():
    # Получаем данные из формы
    origin = request.form.get('origin')
    destination = request.form.get('destination')
    depart_date = request.form.get('depart_date')
    return_date = request.form.get('return_date')
    passengers = request.form.get('passengers')
    
    # Заглушки данных
    flight_data = [
        {
            'airline': 'S7 Airlines',
            'price': 12500,
            'depart_time': '07:00',
            'arrival_time': '10:00',
            'duration': '3ч 00м',
            'stops': 'Прямой',
            'logo': 's7_logo.png'
        },
        {
            'airline': 'Turkish Airlines',
            'price': 14200,
            'depart_time': '14:30',
            'arrival_time': '18:45',
            'duration': '4ч 15м',
            'stops': 'Прямой',
            'logo': 'tk_logo.png'
        }
    ]
    
    return render_template('search_results.html', 
                         flights=flight_data,
                         origin=origin,
                         destination=destination,
                         depart_date=depart_date,
                         return_date=return_date)

# Страница бронирования
@app.route('/booking')
def booking():
    return render_template('booking.html')

# API для создания бронирования
@app.route('/api/book', methods=['POST'])
def book_flight():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Необходимо авторизоваться'})
    
    data = request.json
    import random
    import string
    
    # Генерация номера бронирования
    booking_ref = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    new_booking = Booking(
        user_id=session['user_id'],
        airline=data['airline'],
        origin=data['origin'],
        destination=data['destination'],
        depart_date=data['depart_date'],
        return_date=data.get('return_date'),
        price=data['price'],
        passengers=data['passengers'],
        booking_reference=booking_ref
    )
    
    db.session.add(new_booking)
    db.session.commit()
    
    return jsonify({'status': 'success', 'booking_reference': booking_ref})

# Страница подтверждения
@app.route('/confirmation')
def confirmation():
    return render_template('confirmation.html')

# API для подписки на цену
@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    email = request.json.get('email')
    route = request.json.get('route')
    # Здесь бы мы сохраняли данные в базу
    print(f"Подписка оформлена: {email} на маршрут {route}")
    return jsonify({'status': 'success', 'message': 'Вы подписаны на уведомления о цене!'})

# Service Worker
@app.route('/sw.js')
def service_worker():
    return app.send_static_file('js/sw.js')

if __name__ == '__main__':
    app.run(debug=True)