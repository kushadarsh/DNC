document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dncForm');
    const fileSection = document.getElementById('fileSection');
    const singleSection = document.getElementById('singleSection');
    const uploadTypeInputs = document.getElementsByName('upload_type');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    const toast = new bootstrap.Toast(document.getElementById('formToast'));
    const emailInput = document.getElementById('platform_email');
    const emailStatus = document.getElementById('email-status');
    const verificationStatus = document.getElementById('verificationStatus');
    
    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Show toast message
    function showToast(message, type = 'info') {
        const toastEl = document.getElementById('formToast');
        const icon = toastEl.querySelector('.toast-header i');
        icon.setAttribute('data-feather', type === 'error' ? 'alert-circle' : 'info');
        feather.replace();
        toastEl.querySelector('.toast-body').textContent = message;
        toast.show();
    }

    // Update verification status UI
    function updateVerificationStatus(status, message) {
        const checkIcon = emailStatus.querySelector('.text-success');
        const xIcon = emailStatus.querySelector('.text-danger');
        const loaderIcon = emailStatus.querySelector('[data-feather="loader"]');
        
        // Reset all icons
        [checkIcon, xIcon, loaderIcon].forEach(icon => icon.classList.add('d-none'));
        
        // Update status message
        verificationStatus.className = 'mt-2 small';
        if (status === 'loading') {
            loaderIcon.classList.remove('d-none');
            verificationStatus.classList.add('text-muted');
            verificationStatus.innerHTML = '<i data-feather="loader" class="feather-sm me-1"></i> Verifying email...';
        } else if (status === 'success') {
            checkIcon.classList.remove('d-none');
            verificationStatus.classList.add('text-success');
            verificationStatus.innerHTML = '<i data-feather="check-circle" class="feather-sm me-1"></i> ' + message;
            submitBtn.classList.remove('d-none');
            submitBtn.disabled = false;
        } else if (status === 'error') {
            xIcon.classList.remove('d-none');
            verificationStatus.classList.add('text-danger');
            verificationStatus.innerHTML = '<i data-feather="alert-circle" class="feather-sm me-1"></i> ' + message;
            submitBtn.classList.add('d-none');
            submitBtn.disabled = true;
        }
        feather.replace();
    }

    // Email verification function
    async function verifyEmail(email) {
        const formData = new FormData();
        formData.append('platform_email', email);
        
        try {
            const response = await fetch('/verify-email', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                updateVerificationStatus('success', result.message || 'Email verified successfully');
                return result;
            } else {
                updateVerificationStatus('error', result.error || 'Failed to verify email');
                return null;
            }
        } catch (error) {
            updateVerificationStatus('error', 'Network error occurred');
            return null;
        }
    }

    // Debounced email verification
    const debouncedVerifyEmail = debounce(async (email) => {
        if (email && email.includes('@')) {
            updateVerificationStatus('loading');
            await verifyEmail(email);
        } else {
            updateVerificationStatus('error', 'Please enter a valid email address');
        }
    }, 500);

    // Email input handler
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        if (email) {
            debouncedVerifyEmail(email);
        } else {
            updateVerificationStatus('error', 'Email is required');
            submitBtn.classList.add('d-none');
            submitBtn.disabled = true;
        }
    });

    // Toggle between file and single entry sections with animation
    uploadTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'file') {
                singleSection.classList.add('d-none');
                fileSection.classList.remove('d-none');
                fileSection.style.opacity = 0;
                setTimeout(() => fileSection.style.opacity = 1, 50);
            } else {
                fileSection.classList.add('d-none');
                singleSection.classList.remove('d-none');
                singleSection.style.opacity = 0;
                setTimeout(() => singleSection.style.opacity = 1, 50);
            }
        });
    });

    // File input feedback
    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', function() {
        const fileName = this.files[0]?.name;
        if (fileName) {
            showToast(`Selected file: ${fileName}`);
        }
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        // Start loading state
        submitBtn.disabled = true;
        spinner.classList.remove('d-none');
        
        try {
            // Step 1: Verify email
            const emailVerification = await verifyEmail(emailInput.value);
            if (!emailVerification) {
                throw new Error('Email verification failed');
            }

            // Step 2: Submit blocklist
            const formData = new FormData();
            formData.append('client_id', emailVerification.client_id);
            formData.append('upload_type', form.upload_type.value);
            
            if (form.upload_type.value === 'file') {
                const file = document.getElementById('file').files[0];
                if (!file) throw new Error('Please select a file');
                formData.append('file', file);
            } else {
                const singleEntry = document.getElementById('single_entry_input').value;
                if (!singleEntry) throw new Error('Please enter an email or domain');
                formData.append('single_entry', singleEntry);
            }

            const submission = await fetch('/submit-blocklist', {
                method: 'POST',
                body: formData
            });
            
            const result = await submission.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            showToast('Successfully uploaded DNC list!');
            setTimeout(() => window.location.href = result.redirect_url, 1500);

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Reset loading state
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // Initialize feather icons
    feather.replace();
});
