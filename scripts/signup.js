document.addEventListener('DOMContentLoaded', function() {
    const genBtn = document.getElementById('genBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const continueBtn = document.getElementById('continueBtn');
    const codeBox = document.getElementById('codeBox');
    const usernameInput = document.getElementById('username');
    const usernameError = document.getElementById('username-error');
    const formError = document.getElementById('form-error');

    let generatedCode = '';

    function showError(field, message) {
        field.textContent = message;
        field.style.display = message ? 'block' : 'none';
    }

    genBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();

        // Clear previous errors
        showError(usernameError, '');
        showError(formError, '');

        if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
            showError(usernameError, 'Username must be 3-32 characters (letters, digits, _, ., -)');
            return;
        }

        genBtn.disabled = true;
        genBtn.textContent = 'Generating...';

        try {
            // 1. Generate user keys for E2EE
            const keyPair = await generateUserKeys();
            const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
            const privateKeyJwk = await exportPrivateKeyJwk(keyPair.privateKey);

            // 2. Send signup request to the backend
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    public_key: publicKeyPem,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                generatedCode = data.recovery_code;

                // 3. Display the recovery code
                codeBox.textContent = generatedCode;
                codeBox.dataset.code = generatedCode;

                // 4. Store the private key locally
                localStorage.setItem(`private_key_${username}`, JSON.stringify(privateKeyJwk));

                // 5. Enable next steps
                genBtn.textContent = 'Code Generated';
                copyBtn.disabled = false;
                downloadBtn.disabled = false;
                continueBtn.style.display = 'inline-block';

            } else {
                const errorData = await response.json();
                showError(formError, errorData.detail || 'An unknown error occurred.');
                genBtn.disabled = false;
                genBtn.textContent = 'Generate Code';
            }
        } catch (error) {
            console.error('Signup error:', error);
            showError(formError, 'An unexpected network error occurred.');
            genBtn.disabled = false;
            genBtn.textContent = 'Generate Code';
        }
    });

    copyBtn.addEventListener('click', async () => {
        if (!generatedCode) return;
        try {
            await navigator.clipboard.writeText(generatedCode);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    });

    downloadBtn.addEventListener('click', function() {
        if (!generatedCode) return;

        const username = usernameInput.value.trim();
        const content = `Crypsis Account Information\n=============================\n\nUsername: ${username}\n\nRecovery Code: \n${generatedCode}\n\n=============================\nKeep this code safe and secure! You will not be able to recover it.`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypsis-backup-${username}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    continueBtn.addEventListener('click', function() {
        localStorage.setItem('prefill_username', usernameInput.value.trim());
        window.location.href = '/login';
    });
});