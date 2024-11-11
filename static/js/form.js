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
    let currentVerificationTimeout;
    
    // Enhanced debounce function with immediate option and timeout clearing
    function debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            const callNow = immediate && !timeout;
            
            if (timeout) {
                clearTimeout(timeout);
            }
            
            timeout = setTimeout(later, wait);
            
            if (callNow) {
                func.apply(context, args);
            }
        };
    }

    // Enhanced toast message with animations
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
        
        // Add showing class for animation
        toastEl.classList.add('showing');
        toast.show();
        
        setTimeout(() => {
            toastEl.classList.remove('showing');
        }, 300);
    }

    // Improved verification status update with animations
    function updateVerificationStatus(status, message, details = '') {
        if (!verificationStatus) {
            console.error('Verification status element not found');
            return;
        }

        const checkIcon = emailStatus.querySelector('.text-success');
        const xIcon = emailStatus.querySelector('.text-danger');
        const loaderIcon = emailStatus.querySelector('[data-feather="loader"]');
        
        // Reset all icons
        [checkIcon, xIcon, loaderIcon].forEach(icon => {
            icon.classList.add('d-none');
            icon.style.opacity = '0';
        });

        // Hide status message initially
        verificationStatus.classList.remove('show');
        
        // Use setTimeout to ensure smooth transition
        setTimeout(() => {
            let statusHtml = '';
            let statusClass = '';
            let showSubmitButton = false;
            
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
                    showSubmitButton = true;
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
            
            // Update status message
            verificationStatus.className = `mt-2 small ${statusClass}`;
            verificationStatus.innerHTML = statusHtml;
            
            // Show icons with transition
            [checkIcon, xIcon, loaderIcon].forEach(icon => {
                if (!icon.classList.contains('d-none')) {
                    icon.style.opacity = '1';
                }
            });
            
            // Show status message with animation
            verificationStatus.classList.add('show');
            
            // Toggle submit button with animation
            if (showSubmitButton) {
                submitBtn.classList.remove('d-none');
                setTimeout(() => {
                    submitBtn.disabled = false;
                }, 300);
            } else {
                submitBtn.disabled = true;
                setTimeout(() => {
                    submitBtn.classList.add('d-none');
                }, 300);
            }
            
            feather.replace();
        }, 100);
    }

    // Enhanced email verification with comprehensive error handling
    async function verifyEmail(email) {
        if (verificationInProgress) {
            console.log('Verification already in progress, skipping');
            return null;
        }
        
        if (currentVerificationTimeout) {
            clearTimeout(currentVerificationTimeout);
        }
        
        const formData = new FormData();
        formData.append('platform_email', email);
        
        verificationInProgress = true;
        
        try {
            console.log('Starting email verification for:', email);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch('/verify-email', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
            let errorMessage = 'Failed to verify email';
            let errorDetails = 'Please try again';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Verification timeout';
                errorDetails = 'The server is taking too long to respond';
            } else if (!navigator.onLine) {
                errorMessage = 'No internet connection';
                errorDetails = 'Please check your connection and try again';
            }
            
            updateVerificationStatus('error', errorMessage, errorDetails);
            return null;
        } finally {
            verificationInProgress = false;
        }
    }

    // Enhanced debounced email verification with proper error handling
    const debouncedVerifyEmail = debounce(async (email) => {
        try {
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
        } catch (error) {
            console.error('Debounced verification error:', error);
            updateVerificationStatus('error', 'Verification failed', 'Please try again');
        }
    }, 500);

    // Enhanced email input handler with error boundary
    emailInput.addEventListener('input', function() {
        try {
            const email = this.value.trim();
            if (!email) {
                updateVerificationStatus('error', 'Email is required');
                return;
            }
            debouncedVerifyEmail(email);
        } catch (error) {
            console.error('Email input error:', error);
            updateVerificationStatus('error', 'An error occurred', 'Please try again');
        }
    });

    // Enhanced section toggle with smooth animations
    uploadTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            try {
                const targetSection = this.value === 'file' ? fileSection : singleSection;
                const otherSection = this.value === 'file' ? singleSection : fileSection;
                
                // Fade out current section
                otherSection.style.opacity = '0';
                otherSection.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    otherSection.classList.add('d-none');
                    targetSection.classList.remove('d-none');
                    
                    // Trigger reflow
                    void targetSection.offsetWidth;
                    
                    // Fade in new section
                    targetSection.style.opacity = '1';
                    targetSection.style.transform = 'translateY(0)';
                }, 300);
            } catch (error) {
                console.error('Section toggle error:', error);
                showToast('Failed to switch sections', 'error');
            }
        });
    });

    // Enhanced file input handler with validation
    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', function() {
        try {
            const file = this.files[0];
            if (file) {
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    showToast('File size exceeds 5MB limit', 'error');
                    this.value = '';
                    return;
                }
                
                const validTypes = ['text/csv', 'text/plain'];
                if (!validTypes.includes(file.type)) {
                    showToast('Please select a CSV or TXT file', 'error');
                    this.value = '';
                    return;
                }
                
                showToast(`Selected file: ${file.name}`, 'success');
            }
        } catch (error) {
            console.error('File input error:', error);
            showToast('Failed to process file', 'error');
            this.value = '';
        }
    });

    // Enhanced form submission with comprehensive error handling
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            if (!form.checkValidity()) {
                e.stopPropagation();
                form.classList.add('was-validated');
                showToast('Please fill in all required fields correctly', 'error');
                return;
            }

            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            
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

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            const submission = await fetch('/submit-blocklist', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!submission.ok) {
                throw new Error(`HTTP error! status: ${submission.status}`);
            }
            
            const result = await submission.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Submission failed');
            }

            showToast('Successfully uploaded DNC list!', 'success');
            setTimeout(() => window.location.href = result.redirect_url, 1500);

        } catch (error) {
            console.error('Form submission error:', error);
            let errorMessage = 'Failed to submit form';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Submission timeout - please try again';
            } else if (!navigator.onLine) {
                errorMessage = 'No internet connection';
            } else {
                errorMessage = error.message;
            }
            
            showToast(`Error: ${errorMessage}`, 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // Initialize feather icons
    feather.replace();
});
