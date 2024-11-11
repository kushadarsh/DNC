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
    
    let verificationInProgress = false;
    
    // Debounce function with immediate option
    function debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // Show toast message with type-based styling
    function showToast(message, type = 'info') {
        const toastEl = document.getElementById('formToast');
        const icon = toastEl.querySelector('.toast-header i');
        const iconType = type === 'error' ? 'alert-circle' : 
                        type === 'success' ? 'check-circle' : 'info';
        icon.setAttribute('data-feather', iconType);
        feather.replace();
        
        const toastBody = toastEl.querySelector('.toast-body');
        toastBody.textContent = message;
        toastBody.className = `toast-body ${type === 'error' ? 'text-danger' : 
                                          type === 'success' ? 'text-success' : ''}`;
        toast.show();
    }

    // Update verification status UI with improved feedback
    function updateVerificationStatus(status, message, details = '') {
        if (!verificationStatus) {
            console.error('Verification status element not found');
            return;
        }

        const checkIcon = emailStatus.querySelector('.text-success');
        const xIcon = emailStatus.querySelector('.text-danger');
        const loaderIcon = emailStatus.querySelector('[data-feather="loader"]');
        
        // Reset all icons and states
        [checkIcon, xIcon, loaderIcon].forEach(icon => icon.classList.add('d-none'));
        verificationStatus.className = 'mt-2 small';
        submitBtn.classList.add('d-none');
        submitBtn.disabled = true;
        
        let statusHtml = '';
        let statusClass = '';
        
        switch (status) {
            case 'loading':
                loaderIcon.classList.remove('d-none');
                statusClass = 'text-muted';
                statusHtml = `<i data-feather="loader" class="feather-sm me-1"></i> ${message}`;
                break;
            case 'success':
                checkIcon.classList.remove('d-none');
                statusClass = 'text-success';
                statusHtml = `<i data-feather="check-circle" class="feather-sm me-1"></i> ${message}`;
                submitBtn.classList.remove('d-none');
                submitBtn.disabled = false;
                break;
            case 'error':
                xIcon.classList.remove('d-none');
                statusClass = 'text-danger';
                statusHtml = `<i data-feather="alert-circle" class="feather-sm me-1"></i> ${message}`;
                if (details) {
                    statusHtml += `<br><small class="text-muted">${details}</small>`;
                }
                break;
            default:
                console.error('Invalid status:', status);
                return;
        }
        
        verificationStatus.className = `mt-2 small ${statusClass}`;
        verificationStatus.innerHTML = statusHtml;
        feather.replace();
    }

    // Enhanced email verification with proper error handling
    async function verifyEmail(email) {
        if (verificationInProgress) {
            console.log('Verification already in progress, skipping');
            return null;
        }
        
        const formData = new FormData();
        formData.append('platform_email', email);
        
        verificationInProgress = true;
        
        try {
            console.log('Starting email verification for:', email);
            const response = await fetch('/verify-email', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Verification response:', result);
            
            if (result.success) {
                updateVerificationStatus('success', result.message, result.details);
                return result;
            } else {
                updateVerificationStatus('error', result.error, result.details);
                return null;
            }
        } catch (error) {
            console.error('Email verification error:', error);
            updateVerificationStatus(
                'error',
                'Failed to verify email',
                'Please check your connection and try again'
            );
            return null;
        } finally {
            verificationInProgress = false;
        }
    }

    // Debounced email verification with proper state handling
    const debouncedVerifyEmail = debounce(async (email) => {
        if (!email) {
            updateVerificationStatus('error', 'Email is required');
            return;
        }
        
        if (!email.includes('@')) {
            updateVerificationStatus('error', 'Please enter a valid email address');
            return;
        }
        
        updateVerificationStatus('loading', 'Verifying email...');
        await verifyEmail(email);
    }, 500);

    // Enhanced email input handler
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        if (!email) {
            updateVerificationStatus('error', 'Email is required');
            return;
        }
        debouncedVerifyEmail(email);
    });

    // Toggle between file and single entry sections with animation
    uploadTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            const targetSection = this.value === 'file' ? fileSection : singleSection;
            const otherSection = this.value === 'file' ? singleSection : fileSection;
            
            otherSection.classList.add('d-none');
            targetSection.classList.remove('d-none');
            targetSection.style.opacity = '0';
            requestAnimationFrame(() => {
                targetSection.style.opacity = '1';
                targetSection.style.transition = 'opacity 0.2s ease-in-out';
            });
        });
    });

    // Enhanced file input feedback
    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                showToast('File size exceeds 5MB limit', 'error');
                this.value = '';
                return;
            }
            showToast(`Selected file: ${file.name}`, 'success');
        }
    });

    // Enhanced form submission with proper error handling
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        submitBtn.disabled = true;
        spinner.classList.remove('d-none');
        
        try {
            const emailVerification = await verifyEmail(emailInput.value);
            if (!emailVerification) {
                throw new Error('Email verification failed');
            }

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
            
            if (!submission.ok) {
                throw new Error(`HTTP error! status: ${submission.status}`);
            }
            
            const result = await submission.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            showToast('Successfully uploaded DNC list!', 'success');
            setTimeout(() => window.location.href = result.redirect_url, 1500);

        } catch (error) {
            console.error('Form submission error:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // Initialize feather icons
    feather.replace();
});
