document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const recoveryCodeInput = document.getElementById('recoveryCode');
    const formError = document.getElementById('form-error');

    // Pre-fill username from signup flow if available
    const prefillUsername = localStorage.getItem('prefill_username');
    if (prefillUsername) {
        usernameInput.value = prefillUsername;
        localStorage.removeItem('prefill_username'); // Clean up
    }

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        formError.textContent = '';

        const username = usernameInput.value.trim();
        const recoveryCode = recoveryCodeInput.value.trim();

        if (recoveryCode.length !== 64) {
            formError.textContent = 'Recovery code must be exactly 64 characters.';
            return;
        }

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
                // Also store the recovery code to retrieve the private key
                // Note: This is for convenience. In a real-world scenario, you might
                // prompt the user for the code again to decrypt a stored private key.
                localStorage.setItem(`recovery_code_${username}`, recoveryCode);
                window.location.href = '/messenger';
            } else {
                const errorData = await response.json();
                formError.textContent = errorData.detail || 'Login failed. Please check your credentials.';
            }
        } catch (error) {
            console.error('Login error:', error);
            formError.textContent = 'An unexpected error occurred during login.';
        }
    });
});