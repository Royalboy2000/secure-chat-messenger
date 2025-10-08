document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // --- DOM Elements ---
    const convList = document.getElementById('convList');
    const contactsListContainer = document.getElementById('contacts-list-container');
    const addContactForm = document.getElementById('addContactForm');
    const contactIdInput = document.getElementById('contactIdInput');
    const addContactError = document.getElementById('add-contact-error');
    const peerNameElem = document.getElementById('peerName');
    const peerAvatarElem = document.getElementById('peerAvatar');
    const convHeader = document.getElementById('conv-header');
    const noConvoSelected = document.getElementById('no-convo-selected');
    const msgsContainer = document.getElementById('msgs');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.querySelector('.send');
    const logoutBtn = document.querySelector('.icon-btn[onclick="logout()"]');
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // --- State ---
    let currentUser = localStorage.getItem('current_user');
    let selectedUser = null;
    let privateKey = null; // This will be a CryptoKey object
    const DEFAULT_AVATAR = '/static/default-avatar.png'; // A default avatar

    // --- Core Functions ---
    async function fetchWithAuth(url, options = {}) {
        const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            logout();
        }
        return response;
    }

    async function loadAndDecryptPrivateKey() {
        const recoveryCode = sessionStorage.getItem('temp_recovery_code');
        const encryptedKeyB64 = localStorage.getItem(`encrypted_private_key_${currentUser}`);

        if (!recoveryCode || !encryptedKeyB64) {
            alert("Your session has expired or is invalid. Please log in again to continue.");
            logout();
            return false;
        }

        try {
            const privateKeyJwk = await decryptPrivateKey(encryptedKeyB64, recoveryCode);
            privateKey = await importPrivateKeyJwk(privateKeyJwk);
            return true;
        } catch (error) {
            console.error("Failed to decrypt private key:", error);
            alert("Failed to decrypt your security key. Your recovery code may be incorrect or the stored data is corrupt. Please log out and try again.");
            logout();
            return false;
        } finally {
            sessionStorage.removeItem('temp_recovery_code');
        }
    }

    function logout() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }

    // --- UI Rendering ---
    function renderUserList(container, users, message) {
        container.innerHTML = '';
        if (users.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
            return;
        }
        users.forEach(user => {
            if (user.username === currentUser) return;
            const userElem = document.createElement('div');
            userElem.className = 'conv-item';
            const avatarUrl = user.profile_picture_path || DEFAULT_AVATAR;
            userElem.innerHTML = `
                <img class="avatar" src="${avatarUrl}" alt="${user.username}'s avatar" onerror="this.src='${DEFAULT_AVATAR}'">
                <div class="details">
                    <div class="name">${user.username}</div>
                    <div class="last-msg">Click to start a conversation</div>
                </div>
            `;
            userElem.addEventListener('click', () => selectUser(user));
            container.appendChild(userElem);
        });
    }

    // --- Data Loading ---
    async function loadAllUsers() {
        try {
            const response = await fetchWithAuth('/api/messages/users');
            if (response.ok) {
                renderUserList(convList, await response.json(), "No other users found.");
            }
        } catch (error) {
            console.error('Failed to load all users:', error);
        }
    }

    async function loadContacts() {
        try {
            const response = await fetchWithAuth('/api/contacts/');
            if (response.ok) {
                renderUserList(contactsListContainer, await response.json(), "Your contact list is empty. Add a contact using their ID.");
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }

    // --- Event Handlers ---
    addContactForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        addContactError.textContent = '';
        const contactId = contactIdInput.value.trim();

        if (!contactId || contactId.length !== 16) {
            addContactError.textContent = 'Please enter a valid 16-character Contact ID.';
            return;
        }

        try {
            const response = await fetchWithAuth('/api/contacts/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact_id: contactId }),
            });
            if (response.ok) {
                contactIdInput.value = '';
                await loadContacts();
            } else {
                const errorData = await response.json();
                addContactError.textContent = errorData.detail || 'Failed to add contact.';
            }
        } catch (error) {
            addContactError.textContent = 'An unexpected error occurred.';
        }
    });

    logoutBtn.addEventListener('click', logout);

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // --- Messaging Functions ---
    async function selectUser(user) {
        selectedUser = user;
        noConvoSelected.style.display = 'none';
        convHeader.style.display = 'flex';
        peerNameElem.textContent = user.username;
        peerAvatarElem.src = user.profile_picture_path || DEFAULT_AVATAR;
        peerAvatarElem.onerror = () => { peerAvatarElem.src = DEFAULT_AVATAR; };
        msgsContainer.innerHTML = '';

        try {
            const response = await fetchWithAuth(`/api/messages/users/${user.username}/key`);
            if (response.ok) {
                selectedUser.publicKey = await importPublicKeyPem(await response.text());
                loadMessages();
            } else {
                console.error("Failed to fetch public key for user:", user.username);
            }
        } catch (error) {
            console.error("Error fetching public key:", error);
        }
    }

    async function sendMessage() {
        const messageText = msgInput.value.trim();
        if (!messageText || !selectedUser || !selectedUser.publicKey) return;

        try {
            const encryptedContent = await encryptMessage(selectedUser.publicKey, messageText);
            const response = await fetchWithAuth('/api/messages/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_username: selectedUser.username,
                    encrypted_content: encryptedContent,
                }),
            });
            if (response.ok) {
                msgInput.value = '';
                displayMessage(messageText, 'sent');
            } else {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async function loadMessages() {
        if (!selectedUser) return;
        try {
            const response = await fetchWithAuth(`/api/messages?sender_id=${selectedUser.id}`);
            if (response.ok) {
                const messages = await response.json();
                msgsContainer.innerHTML = '';
                for (const msg of messages) {
                    const isOwnMessage = msg.sender_id === currentUser.id;
                    const decryptedContent = await decryptMessage(privateKey, msg.encrypted_content);
                    displayMessage(decryptedContent, isOwnMessage ? 'sent' : 'received');
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    function displayMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type}`;
        msgDiv.textContent = text;
        msgsContainer.appendChild(msgDiv);
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

    // --- Initial Load ---
    const keyLoaded = await loadAndDecryptPrivateKey();
    if (keyLoaded) {
        await loadAllUsers();
        await loadContacts();
    }
});