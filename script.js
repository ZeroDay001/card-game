// ================== Глобальные переменные ==================
let ws = null;
let currentUser = null;
let isAuthenticated = false;
let isHost = false;
let gameState = {
    turn: 'player',
    player: { health: 30, maxMana: 0, currentMana: 0, deck: [], hand: [], field: [] },
    opponent: { health: 30, maxMana: 0, currentMana: 0, deck: [], hand: [], field: [] },
};

// Данные карт и колоды (загружаются с сервера)
let availableCards = [];
let currentDeck = []; // массив id карт (с повторами)

// Игровые переменные
let roomId = null;
let myPlayerId = null;

// ================== Элементы DOM ==================
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const editorScreen = document.getElementById('editor-screen');
const deckScreen = document.getElementById('deck-screen');
const gameScreen = document.getElementById('game-screen');

const authMessage = document.getElementById('auth-message');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');

// Авторизация
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');

// Главное меню
const hostBtn = document.getElementById('host-game');
const joinBtn = document.getElementById('join-game');
const roomIdInput = document.getElementById('room-id-input');
const editCardsBtn = document.getElementById('edit-cards-btn');
const editDeckBtn = document.getElementById('edit-deck-btn');
const backToMainFromEditor = document.getElementById('back-to-main-from-editor');
const backToMainFromDeck = document.getElementById('back-to-main-from-deck');

// Редактор карт
const cardForm = document.getElementById('card-form');
const cardId = document.getElementById('card-id');
const cardName = document.getElementById('card-name');
const cardDescription = document.getElementById('card-description');
const cardAttack = document.getElementById('card-attack');
const cardHealth = document.getElementById('card-health');
const cardBonus = document.getElementById('card-bonus');
const cardImage = document.getElementById('card-image');
const imagePreview = document.getElementById('image-preview');
const cancelEdit = document.getElementById('cancel-edit');
const cardsListDiv = document.getElementById('cards-list');

// Конструктор колоды
const deckCountSpan = document.getElementById('deck-count');
const deckCardsDiv = document.getElementById('deck-cards-list');
const availableCardsDiv = document.getElementById('available-cards-list');

// Игровой экран
const endTurnBtn = document.getElementById('end-turn-btn');

// ================== Утилиты ==================
function generateCardId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ================== Работа с сервером через WebSocket ==================
function connectWebSocket() {
    // ЗАМЕНИТЕ НА АДРЕС ВАШЕГО СЕРВЕРА
    const SERVER_URL = 'ws://95.123.45.67:8765';  // пример
    ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        console.log('WebSocket открыт');
        // После подключения сервер ждёт авторизацию
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Получено:', data);

        if (data.type === 'auth_result') {
            if (data.success) {
                isAuthenticated = true;
                authScreen.classList.add('hidden');
                mainScreen.classList.remove('hidden');
                usernameDisplay.textContent = currentUser;
                // Загружаем карты и колоду пользователя
                ws.send(JSON.stringify({ type: 'get_cards' }));
                ws.send(JSON.stringify({ type: 'get_deck' }));
            } else {
                authMessage.textContent = data.message;
            }
        }
        else if (data.type === 'cards_list') {
            availableCards = data.cards || [];
            if (!availableCards.length) {
                // Если карт нет, создаём несколько базовых
                createDefaultCards();
            }
            renderCardsList();
        }
        else if (data.type === 'save_cards_ok') {
            alert('Карты сохранены');
        }
        else if (data.type === 'deck_list') {
            currentDeck = data.deck || [];
            renderDeckBuilder();
        }
        else if (data.type === 'save_deck_ok') {
            alert('Колода сохранена');
        }
        else if (data.type === 'room_created') {
            roomId = data.roomId;
            alert(`ID комнаты: ${roomId}. Передайте его другу.`);
        }
        else if (data.type === 'init') {
            // Начало игры
            myPlayerId = data.playerId;
            roomId = data.roomId;
            mainScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            if (myPlayerId === 'player1') {
                isHost = true;
                startNewGame();
            } else {
                isHost = false;
            }
        }
        else if (data.type === 'gameState') {
            gameState = data.state;
            updateUI();
        }
        else if (data.type === 'action') {
            handleOpponentAction(data.action);
        }
        else if (data.type === 'error') {
            alert(data.message);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket ошибка:', err);
        authMessage.textContent = 'Ошибка соединения с сервером';
    };

    ws.onclose = () => {
        console.log('WebSocket закрыт');
        if (isAuthenticated) {
            alert('Соединение с сервером потеряно. Перезагрузите страницу.');
        }
    };
}

// Создание базовых карт, если у пользователя их нет
function createDefaultCards() {
    availableCards = [
        { id: generateCardId(), name: 'Волк', description: 'Злой волк', attack: 3, health: 2, cost: 2, bonus: '', image: '' },
        { id: generateCardId(), name: 'Медведь', description: 'Сильный медведь', attack: 4, health: 3, cost: 3, bonus: '', image: '' },
        { id: generateCardId(), name: 'Орёл', description: 'Быстрый орёл', attack: 5, health: 4, cost: 4, bonus: '', image: '' },
        { id: generateCardId(), name: 'Дракон', description: 'Огненный дракон', attack: 6, health: 5, cost: 5, bonus: '', image: '' },
        { id: generateCardId(), name: 'Рыцарь', description: 'Храбрый рыцарь', attack: 2, health: 1, cost: 1, bonus: '', image: '' },
        { id: generateCardId(), name: 'Лучник', description: 'Меткий лучник', attack: 2, health: 2, cost: 2, bonus: '', image: '' },
        { id: generateCardId(), name: 'Целитель', description: 'Лечит', attack: 1, health: 4, cost: 3, bonus: '', image: '' },
        { id: generateCardId(), name: 'Маг', description: 'Колдует', attack: 4, health: 2, cost: 4, bonus: '', image: '' }
    ];
    // Сохраняем на сервер
    ws.send(JSON.stringify({ type: 'save_cards', cards: availableCards }));
}

// ================== Авторизация ==================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) {
        authMessage.textContent = 'Заполните все поля';
        return;
    }
    currentUser = username;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        // Ждём открытия, затем отправим логин
        const onOpen = () => {
            ws.send(JSON.stringify({ type: 'login', username, password }));
            ws.removeEventListener('open', onOpen);
        };
        ws.addEventListener('open', onOpen);
    } else {
        ws.send(JSON.stringify({ type: 'login', username, password }));
    }
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    if (!username || !password) {
        authMessage.textContent = 'Заполните все поля';
        return;
    }
    currentUser = username;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'register', username, password }));
        });
    } else {
        ws.send(JSON.stringify({ type: 'register', username, password }));
    }
});

logoutBtn.addEventListener('click', () => {
    if (ws) ws.close();
    isAuthenticated = false;
    currentUser = null;
    mainScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
});

// Переключение вкладок авторизации
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
        authMessage.textContent = '';
    });
});

// ================== Редактор карт ==================
function renderCardsList() {
    cardsListDiv.innerHTML = '';
    availableCards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card-item';
        el.innerHTML = `
            <img src="${card.image || 'https://via.placeholder.com/100?text=No+Image'}" alt="${card.name}">
            <h4>${card.name}</h4>
            <div class="stats">⚔️${card.attack} ❤️${card.health}</div>
            <div class="card-actions">
                <button onclick="editCard('${card.id}')">✏️</button>
                <button onclick="deleteCard('${card.id}')">🗑️</button>
            </div>
        `;
        cardsListDiv.appendChild(el);
    });
}

window.editCard = (id) => {
    const card = availableCards.find(c => c.id === id);
    if (!card) return;
    cardId.value = card.id;
    cardName.value = card.name;
    cardDescription.value = card.description || '';
    cardAttack.value = card.attack;
    cardHealth.value = card.health;
    cardBonus.value = card.bonus || '';
    if (card.image) {
        imagePreview.innerHTML = `<img src="${card.image}" style="max-width:100px">`;
    } else {
        imagePreview.innerHTML = '';
    }
};

window.deleteCard = (id) => {
    if (confirm('Удалить карту?')) {
        availableCards = availableCards.filter(c => c.id !== id);
        // Удалить из колоды все экземпляры этой карты
        currentDeck = currentDeck.filter(cid => cid !== id);
        ws.send(JSON.stringify({ type: 'save_cards', cards: availableCards }));
        ws.send(JSON.stringify({ type: 'save_deck', deck: currentDeck }));
        renderCardsList();
    }
};

cardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = cardId.value;
    const name = cardName.value.trim();
    const description = cardDescription.value.trim();
    const attack = parseInt(cardAttack.value);
    const health = parseInt(cardHealth.value);
    const bonus = cardBonus.value.trim();
    const file = cardImage.files[0];

    if (!name || isNaN(attack) || isNaN(health)) {
        alert('Заполните обязательные поля');
        return;
    }

    const processImage = (imageData) => {
        if (id) {
            const index = availableCards.findIndex(c => c.id === id);
            if (index !== -1) {
                availableCards[index] = {
                    ...availableCards[index],
                    name,
                    description,
                    attack,
                    health,
                    cost: attack,
                    bonus,
                    image: imageData || availableCards[index].image
                };
            }
        } else {
            const newCard = {
                id: generateCardId(),
                name,
                description,
                attack,
                health,
                cost: attack,
                bonus,
                image: imageData || ''
            };
            availableCards.push(newCard);
        }
        ws.send(JSON.stringify({ type: 'save_cards', cards: availableCards }));
        renderCardsList();
        resetCardForm();
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            processImage(event.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        processImage(null);
    }
});

cancelEdit.addEventListener('click', resetCardForm);
function resetCardForm() {
    cardId.value = '';
    cardForm.reset();
    imagePreview.innerHTML = '';
}

// ================== Конструктор колоды ==================
function renderDeckBuilder() {
    deckCountSpan.textContent = currentDeck.length;

    const countMap = new Map();
    currentDeck.forEach(cid => {
        countMap.set(cid, (countMap.get(cid) || 0) + 1);
    });

    deckCardsDiv.innerHTML = '';
    for (let [cid, cnt] of countMap.entries()) {
        const card = availableCards.find(c => c.id === cid);
        if (!card) continue;
        const el = document.createElement('div');
        el.className = 'card-item';
        el.innerHTML = `
            <div class="deck-count">${cnt}</div>
            <img src="${card.image || 'https://via.placeholder.com/100?text=No+Image'}" alt="${card.name}">
            <h4>${card.name}</h4>
            <div class="stats">⚔️${card.attack} ❤️${card.health}</div>
            <div class="card-actions">
                <button onclick="removeFromDeck('${cid}')">−</button>
            </div>
        `;
        deckCardsDiv.appendChild(el);
    }

    availableCardsDiv.innerHTML = '';
    availableCards.forEach(card => {
        const currentCount = currentDeck.filter(id => id === card.id).length;
        const maxReached = currentCount >= 3;
        const totalCards = currentDeck.length;
        const deckFull = totalCards >= 50;

        const el = document.createElement('div');
        el.className = 'card-item';
        el.innerHTML = `
            <img src="${card.image || 'https://via.placeholder.com/100?text=No+Image'}" alt="${card.name}">
            <h4>${card.name}</h4>
            <div class="stats">⚔️${card.attack} ❤️${card.health}</div>
            <div class="card-actions">
                ${!maxReached && !deckFull ? `<button onclick="addToDeck('${card.id}')">+</button>` : ''}
                ${currentCount > 0 ? `<span style="background:#1e7e5c; color:white; padding:3px 8px; border-radius:20px;">${currentCount}/3</span>` : ''}
            </div>
        `;
        availableCardsDiv.appendChild(el);
    });
}

window.addToDeck = (cardId) => {
    const currentCount = currentDeck.filter(id => id === cardId).length;
    if (currentCount >= 3) {
        alert('Нельзя добавить больше 3 экземпляров этой карты');
        return;
    }
    if (currentDeck.length >= 50) {
        alert('Колода не может содержать больше 50 карт');
        return;
    }
    currentDeck.push(cardId);
    ws.send(JSON.stringify({ type: 'save_deck', deck: currentDeck }));
    renderDeckBuilder();
};

window.removeFromDeck = (cardId) => {
    const index = currentDeck.lastIndexOf(cardId);
    if (index !== -1) {
        currentDeck.splice(index, 1);
        ws.send(JSON.stringify({ type: 'save_deck', deck: currentDeck }));
        renderDeckBuilder();
    }
};

// ================== Игровая логика ==================
function startNewGame() {
    // Создаём колоду из currentDeck
    let deckCards = [];
    if (currentDeck.length === 0) {
        // Если колода пуста, используем все карты по 3
        const temp = [];
        availableCards.forEach(card => {
            for (let i = 0; i < 3; i++) temp.push(card);
        });
        shuffleArray(temp);
        deckCards = temp.slice(0, 50);
    } else {
        deckCards = currentDeck.map(cid => {
            const card = availableCards.find(c => c.id === cid);
            if (!card) return null;
            return { ...card, id: Math.random().toString(36).substr(2, 8) };
        }).filter(c => c !== null);
        shuffleArray(deckCards);
    }

    gameState = {
        turn: 'player',
        player: {
            health: 30,
            maxMana: 0,
            currentMana: 0,
            deck: deckCards,
            hand: [],
            field: []
        },
        opponent: {
            health: 30,
            maxMana: 0,
            currentMana: 0,
            deck: [], // будет заполнено при синхронизации
            hand: [],
            field: []
        }
    };
    for (let i = 0; i < 3; i++) drawCard('player');
    for (let i = 0; i < 3; i++) drawCard('opponent');
    updateUI();
}

function drawCard(playerSide) {
    const player = gameState[playerSide];
    if (player.deck.length === 0) return;
    const card = player.deck.pop();
    player.hand.push(card);
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function handleOpponentAction(action) {
    switch (action.type) {
        case 'playCard':
            const card = gameState.opponent.hand[action.cardIndex];
            if (card) {
                gameState.opponent.hand.splice(action.cardIndex, 1);
                gameState.opponent.field.push({ ...card, canAttack: false });
                gameState.opponent.currentMana -= action.cost;
            }
            break;
        case 'attack':
            const attacker = gameState.opponent.field[action.attackerIndex];
            if (attacker) {
                attacker.canAttack = false;
                gameState.player.health -= attacker.attack;
            }
            break;
        case 'endTurn':
            gameState.turn = 'player';
            break;
    }
    updateUI();
}

function playCard(cardIndex) {
    if (gameState.turn !== 'player') return;
    const card = gameState.player.hand[cardIndex];
    if (!card || gameState.player.currentMana < card.cost) return;

    gameState.player.hand.splice(cardIndex, 1);
    gameState.player.currentMana -= card.cost;
    gameState.player.field.push({ ...card, canAttack: false });

    ws.send(JSON.stringify({ type: 'action', action: { type: 'playCard', cardIndex, cost: card.cost }, roomId }));

    updateUI();
}

function attackWithCreature(fieldIndex) {
    if (gameState.turn !== 'player') return;
    const attacker = gameState.player.field[fieldIndex];
    if (!attacker || !attacker.canAttack) return;

    attacker.canAttack = false;
    gameState.opponent.health -= attacker.attack;

    ws.send(JSON.stringify({ type: 'action', action: { type: 'attack', attackerIndex: fieldIndex }, roomId }));

    if (gameState.opponent.health <= 0) {
        setTimeout(() => alert('Вы победили!'), 100);
    }
    updateUI();
}

function endTurn() {
    if (gameState.turn !== 'player') return;

    gameState.player.field.forEach(c => c.canAttack = false);
    gameState.turn = 'opponent';

    if (isHost) {
        gameState.opponent.maxMana = Math.min(10, gameState.opponent.maxMana + 1);
        gameState.opponent.currentMana = gameState.opponent.maxMana;
        drawCard('opponent');
        ws.send(JSON.stringify({ type: 'gameState', state: gameState, roomId }));
    }

    ws.send(JSON.stringify({ type: 'action', action: { type: 'endTurn' }, roomId }));
    updateUI();
}

function updateUI() {
    document.getElementById('player-health').innerText = gameState.player.health;
    document.getElementById('player-mana').innerText = `⚡${gameState.player.currentMana}/${gameState.player.maxMana}`;
    document.getElementById('opponent-health').innerText = gameState.opponent.health;
    document.getElementById('opponent-mana').innerText = `⚡${gameState.opponent.currentMana}/${gameState.opponent.maxMana}`;
    document.getElementById('turn-indicator').innerText = gameState.turn === 'player' ? 'Ваш ход' : 'Ход противника';

    const playerField = document.getElementById('player-field');
    const playerHand = document.getElementById('player-hand');
    const opponentField = document.getElementById('opponent-field');
    const opponentHand = document.getElementById('opponent-hand');

    playerField.innerHTML = '';
    playerHand.innerHTML = '';
    opponentField.innerHTML = '';
    opponentHand.innerHTML = '';

    gameState.player.hand.forEach((card, index) => {
        const el = createCardElement(card, 'hand');
        el.addEventListener('click', () => playCard(index));
        playerHand.appendChild(el);
    });

    gameState.player.field.forEach((card, index) => {
        const el = createCardElement(card, 'field');
        if (card.canAttack && gameState.turn === 'player') {
            el.classList.add('can-attack');
            el.addEventListener('click', () => attackWithCreature(index));
        }
        playerField.appendChild(el);
    });

    for (let i = 0; i < gameState.opponent.hand.length; i++) {
        const el = document.createElement('div');
        el.className = 'card in-hand';
        el.style.background = '#3b2a1c';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.innerText = '???';
        opponentHand.appendChild(el);
    }

    gameState.opponent.field.forEach((card) => {
        opponentField.appendChild(createCardElement(card, 'field'));
    });
}

function createCardElement(card, location) {
    const div = document.createElement('div');
    div.className = `card ${location === 'hand' ? 'in-hand' : 'on-field'}`;
    if (card.image) {
        div.innerHTML = `
            <div class="cost">${card.cost}</div>
            <img src="${card.image}" style="width:100%; height:60px; object-fit:cover; border-radius:8px;">
            <div class="stats">
                <span>⚔️${card.attack}</span>
                <span>❤️${card.health}</span>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="cost">${card.cost}</div>
            <div class="name">${card.name}</div>
            <div class="stats">
                <span>⚔️${card.attack}</span>
                <span>❤️${card.health}</span>
            </div>
        `;
    }
    return div;
}

// ================== Обработчики навигации ==================
editCardsBtn.addEventListener('click', () => {
    mainScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    renderCardsList();
});

editDeckBtn.addEventListener('click', () => {
    mainScreen.classList.add('hidden');
    deckScreen.classList.remove('hidden');
    renderDeckBuilder();
});

backToMainFromEditor.addEventListener('click', () => {
    editorScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
});

backToMainFromDeck.addEventListener('click', () => {
    deckScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
});

hostBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'join', role: 'host' }));
});

joinBtn.addEventListener('click', () => {
    const rid = roomIdInput.value.trim();
    if (!rid) return;
    ws.send(JSON.stringify({ type: 'join', role: 'client', roomId: rid }));
});

endTurnBtn.addEventListener('click', endTurn);

// Предпросмотр изображения
cardImage.addEventListener('change', () => {
    const file = cardImage.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" style="max-width:100px">`;
        };
        reader.readAsDataURL(file);
    }
});