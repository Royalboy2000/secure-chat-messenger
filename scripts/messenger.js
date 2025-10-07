document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const convList = document.getElementById('convList');
    const contactsList = document.querySelector('.contacts-list');
    const peerNameElem = document.getElementById('peerName');
    const peerAvatarElem = document.getElementById('peerAvatar');
    const msgsContainer = document.getElementById('msgs');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.querySelector('.send');
    const logoutBtn = document.querySelector('.icon-btn[onclick="logout()"]');

    let currentUser = localStorage.getItem('current_user');
    let users = [];
    let selectedUser = null;
    let privateKey = null;

    async function fetchWithAuth(url, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
        }
        return response;
    }

    async function loadPrivateKey() {
        const privateKeyJwk = JSON.parse(localStorage.getItem(`private_key_${currentUser}`));
        if (privateKeyJwk) {
            privateKey = await importPrivateKeyJwk(privateKeyJwk);
        } else {
            console.error("Private key not found. Please log in again.");
            logout();
        }
    }

    function logout() {
        localStorage.clear();
        window.location.href = '/login';
    }

    logoutBtn.addEventListener('click', logout);

    async function loadUsers() {
        try {
            const response = await fetchWithAuth('/api/messages/users');
            if (response.ok) {
                users = await response.json();
                renderUsers();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    function renderUsers() {
        convList.innerHTML = '';
        contactsList.innerHTML = ''; // Assuming you want to populate both lists
        users.forEach(user => {
            if (user.username === currentUser) return;

            const userElem = document.createElement('div');
            userElem.className = 'conv-item';
            userElem.innerHTML = `
                <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div class="details">
                    <div class="name">${user.username}</div>
                    <div class="last-msg">Click to start a conversation</div>
                </div>
            `;
            userElem.addEventListener('click', () => selectUser(user));
            convList.appendChild(userElem);

            const contactElem = userElem.cloneNode(true);
            contactElem.addEventListener('click', () => selectUser(user));
            contactsList.appendChild(contactElem)
        });
    }

    async function selectUser(user) {
        selectedUser = user;
        peerNameElem.textContent = user.username;
        peerAvatarElem.textContent = user.username.charAt(0).toUpperCase();
        msgsContainer.innerHTML = ''; // Clear previous messages

        // Fetch user's public key
        try {
            const response = await fetchWithAuth(`/api/messages/users/${user.username}/key`);
            if (response.ok) {
                const publicKeyPem = await response.text();
                selectedUser.publicKey = await importPublicKeyPem(publicKeyPem);
            } else {
                console.error("Failed to fetch public key for user:", user.username);
            }
        } catch (error) {
            console.error("Error fetching public key:", error);
        }

        loadMessages();
    }

    async function sendMessage() {
        const messageText = msgInput.value.trim();
        if (!messageText || !selectedUser || !selectedUser.publicKey) {
            return;
        }

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
            const response = await fetchWithAuth('/api/messages/messages');
            if (response.ok) {
                const messages = await response.json();
                msgsContainer.innerHTML = '';
                for (const msg of messages) {
                    // This is a simplification. We need to know the sender.
                    // The backend should probably provide sender info.
                    // For now, we assume all messages are from the selected user.
                    if (msg.sender_id === selectedUser.id) {
                        try {
                            const decryptedContent = await decryptMessage(privateKey, msg.encrypted_content);
                            displayMessage(decryptedContent, 'received');
                        } catch (e) {
                            console.error("Decryption failed:", e);
                            displayMessage("[Could not decrypt message]", 'received error');
                        }
                    }
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
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial load
    await loadPrivateKey();
    await loadUsers();

    // Periodically fetch messages
    setInterval(loadMessages, 5000);
});