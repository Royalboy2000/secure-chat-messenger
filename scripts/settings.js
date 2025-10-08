document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // DOM Elements
    const usernameDisplay = document.getElementById('username-display');
    const contactIdDisplay = document.getElementById('contact-id-display');
    const pfpPreview = document.getElementById('pfp-preview');
    const pfpForm = document.getElementById('pfp-form');
    const pfpInput = document.getElementById('pfp-input');
    const pfpError = document.getElementById('pfp-error');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const newCodeBox = document.getElementById('new-code-box');
    const newCodeDisplay = document.getElementById('new-code-display');
    const regenError = document.getElementById('regen-error');
    const DEFAULT_AVATAR = '/static/default-avatar.svg';

    let currentUser = null;

    async function fetchWithAuth(url, options = {}) {
        const headers = { ...options.headers };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
        return response;
    }

    // Fetch current user data on page load
    async function loadUserData() {
        try {
            const response = await fetchWithAuth('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
                usernameDisplay.textContent = currentUser.username;
                contactIdDisplay.textContent = currentUser.contact_id;
                pfpPreview.src = currentUser.profile_picture_path || DEFAULT_AVATAR;
                pfpPreview.onerror = function() { this.onerror=null; this.src=DEFAULT_AVATAR; };
            } else {
                console.error("Failed to fetch user data.");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }

    // Handle Profile Picture Upload
    pfpForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        pfpError.textContent = '';

        const file = pfpInput.files[0];
        if (!file) {
            pfpError.textContent = 'Please select a file.';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetchWithAuth('/api/settings/profile-picture', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const updatedUser = await response.json();
                pfpPreview.src = updatedUser.profile_picture_path;
            } else {
                const errorData = await response.json();
                pfpError.textContent = errorData.detail || 'Upload failed.';
            }
        } catch (error) {
            pfpError.textContent = 'An unexpected error occurred.';
            console.error('PFP Upload Error:', error);
        }
    });

    // Handle Recovery Code Regeneration
    regenerateBtn.addEventListener('click', async function() {
        regenError.textContent = '';
        if (!confirm('Are you sure you want to regenerate your recovery code? Your old code will stop working immediately.')) {
            return;
        }

        try {
            const response = await fetchWithAuth('/api/settings/regenerate-code', {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                newCodeDisplay.textContent = data.recovery_code;
                newCodeBox.style.display = 'block';
                alert('Your new recovery code has been generated. Please save it in a secure place. You will not be shown this again.');
            } else {
                const errorData = await response.json();
                regenError.textContent = errorData.detail || 'Failed to regenerate code.';
            }
        } catch (error) {
            regenError.textContent = 'An unexpected error occurred.';
            console.error('Regen Error:', error);
        }
    });

    loadUserData();
});