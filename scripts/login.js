document.addEventListener('DOMContentLoaded', function() {
    const codeInput = document.getElementById('recovery');
    const usernameInput = document.getElementById('username');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('loginForm');
    const errorContainer = document.querySelector('.error-message');

    // Pre-fill username from signup flow if available
    const prefillUsername = localStorage.getItem('prefill_username');
    if (prefillUsername) {
        usernameInput.value = prefillUsername;
        localStorage.removeItem('prefill_username');
    }

    function showError(show, msg) {
        if (msg) errorContainer.textContent = msg;
        errorContainer.style.display = show ? 'block' : 'none';
    }

    async function handleLogin(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const recoveryCode = codeInput.value.trim();

        showError(false);

        if (!username || recoveryCode.length !== 64) {
            showError(true, 'Please provide a valid username and 64-character recovery code.');
            return;
        }

        // UI Loading state
        const btnText = document.querySelector('.btn-text');
        const loading = document.querySelector('.loading');
        if(btnText && loading) {
            btnText.style.display = 'none';
            loading.style.display = 'flex';
        }
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    recovery_code: recoveryCode,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('current_user', username);

                // Securely store the recovery code in sessionStorage for one-time use.
                sessionStorage.setItem('temp_recovery_code', recoveryCode);

                form.classList.add('success');
                setTimeout(() => {
                    window.location.href = 'messenger.html';
                }, 400);

            } else {
                const errorData = await response.json();
                showError(true, errorData.detail || 'Login failed. Check your credentials.');
                resetButton();
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(true, 'An unexpected network error occurred.');
            resetButton();
        }
    }

    function resetButton() {
        const btnText = document.querySelector('.btn-text');
        const loading = document.querySelector('.loading');
        if(btnText && loading) {
            btnText.style.display = 'inline';
            loading.style.display = 'none';
        }
        submitBtn.disabled = false;
    }

    form.addEventListener('submit', handleLogin);

    codeInput.addEventListener('input', () => showError(false));
    usernameInput.addEventListener('input', () => showError(false));
});