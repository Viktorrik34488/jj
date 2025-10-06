// Кэш для изображений
const imageCache = new Map();

// Функция для кэширования и загрузки изображений
function loadImageWithCache(url) {
    return new Promise((resolve, reject) => {
        if (imageCache.has(url)) {
            resolve(imageCache.get(url));
            return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = function() {
            imageCache.set(url, {
                src: url,
                width: img.width,
                height: img.height,
                element: img
            });
            resolve(imageCache.get(url));
        };
        
        img.onerror = function() {
            reject(new Error(`Не удалось загрузить изображение: ${url}`));
        };
        
        img.src = url;
    });
}

// Проверка видимости элемента
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.bottom >= 0 &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
        rect.right >= 0
    );
}

// Улучшенная ленивая загрузка с кэшированием
function lazyLoadImages() {
    const images = document.querySelectorAll('.destination-image:not([data-loaded="true"])');
    
    images.forEach(img => {
        if (isElementInViewport(img)) {
            const src = img.getAttribute('data-src');
            if (src) {
                loadImageWithCache(src)
                    .then(cachedImage => {
                        img.style.backgroundImage = `url('${cachedImage.src}')`;
                        img.setAttribute('data-loaded', 'true');
                        img.style.opacity = '1';
                    })
                    .catch(error => {
                        console.warn('Ошибка загрузки изображения:', error);
                        // Fallback градиент
                        img.style.background = 'linear-gradient(135deg, #4fd1c5 0%, #319795 100%)';
                        img.style.display = 'flex';
                        img.style.alignItems = 'center';
                        img.style.justifyContent = 'center';
                        img.innerHTML = '<span style="color: white; font-weight: bold;">Сочи</span>';
                        img.setAttribute('data-loaded', 'true');
                    });
            }
        }
    });
}

// Preload важных изображений
function preloadCriticalImages() {
    const criticalImages = [
        'https://images.unsplash.com/photo-1596436889106-be35e843f975?w=300&h=200&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=300&h=200&fit=crop&auto=format&q=80'
    ];
    
    criticalImages.forEach(src => {
        loadImageWithCache(src).catch(() => {});
    });
}

// Service Worker для кэширования
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker зарегистрирован');
            })
            .catch(error => {
                console.log('ServiceWorker не поддерживается:', error);
            });
    }
}

// Оптимизированный обработчик скролла
let scrollTimeout;
function throttledScrollHandler() {
    if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
            lazyLoadImages();
            checkScroll();
            scrollTimeout = null;
        }, 100);
    }
}

// Очистка кэша
setInterval(() => {
    if (imageCache.size > 50) {
        const keys = Array.from(imageCache.keys());
        for (let i = 0; i < Math.min(10, keys.length); i++) {
            imageCache.delete(keys[i]);
        }
    }
}, 24 * 60 * 60 * 1000);

// Обработка формы подписки на цену
document.addEventListener('DOMContentLoaded', function() {
    preloadCriticalImages();
    registerServiceWorker();
    
    const subscribeForm = document.getElementById('price-alert-form');
    
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                email: document.getElementById('email').value,
                route: document.getElementById('alert-route').value
            };
            
            fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                subscribeForm.reset();
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }
    
    // Динамическое обновление дат в форме
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    
    dateInputs.forEach(input => {
        input.min = today;
    });
    
    // Анимация появления элементов при прокрутке
    const animatedElements = document.querySelectorAll('.glass-card');
    
    function checkScroll() {
        animatedElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.style.animation = 'fadeInUp 0.8s ease forwards';
            }
        });
    }
    
    // Запускаем сразу при загрузке
    lazyLoadImages();
    checkScroll();
    
    // Добавляем дополнительные самолетики в фон
    function addAirplanes() {
        const body = document.querySelector('body');
        for (let i = 0; i < 3; i++) {
            const airplane = document.createElement('div');
            airplane.className = 'airplane';
            airplane.innerHTML = '✈';
            airplane.style.top = `${Math.random() * 80 + 10}%`;
            airplane.style.left = `${Math.random() * 20 - 20}%`;
            airplane.style.animationDelay = `${Math.random() * 20}s`;
            body.appendChild(airplane);
        }
    }
    
    addAirplanes();
    
    // Обработка клика по популярным направлениям
    const destinationCards = document.querySelectorAll('.destination-card');
    destinationCards.forEach(card => {
        card.addEventListener('click', function() {
            const destination = this.getAttribute('data-destination');
            const [origin, dest] = destination.split('-');
            
            document.getElementById('origin').value = origin;
            document.getElementById('destination').value = dest;
            
            document.querySelector('.search-form').scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Анимация кнопки поиска
    const searchForm = document.getElementById('flightSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('.search-btn');
            submitBtn.classList.add('loading');
            
            setTimeout(() => {
                submitBtn.classList.remove('loading');
            }, 2000);
        });
    }
    
    // Оптимизированные обработчики событий
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    window.addEventListener('resize', throttledScrollHandler, { passive: true });
    
    window.addEventListener('load', function() {
        lazyLoadImages();
        checkScroll();
    });
});
// Обработка формы входа
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/login', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    window.location.href = '/';
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Произошла ошибка при входе');
            });
        });
    }
    
    // Обработка формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/register', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    window.location.href = '/login';
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Произошла ошибка при регистрации');
            });
        });
    }
});

// Функция для скачивания билета
function downloadTicket(bookingRef) {
    alert(`Билет для бронирования ${bookingRef} будет скачан`);
    // Здесь можно реализовать генерацию PDF билета
}

// Функция для бронирования рейса
function bookFlight(flightData) {
    if (!sessionStorage.getItem('user_id')) {
        window.location.href = '/login';
        return;
    }
    
    fetch('/api/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = `/confirmation?ref=${data.booking_reference}`;
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Произошла ошибка при бронировании');
    });
}
// Обработчик формы поиска билетов
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('flightSearchForm');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.search-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const originalText = btnText.textContent;
            
            // Показываем загрузку
            submitBtn.classList.add('loading');
            btnText.textContent = 'ПОИСК...';
            
            // Собираем данные формы
            const formData = new FormData(this);
            
            // Отправляем запрос
            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    return response.text();
                }
            })
            .then(html => {
                if (html) {
                    document.open();
                    document.write(html);
                    document.close();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Произошла ошибка при поиске. Попробуйте еще раз.');
            })
            .finally(() => {
                // Возвращаем исходное состояние кнопки
                submitBtn.classList.remove('loading');
                btnText.textContent = originalText;
            });
        });
    }
});