document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dncForm');
    const fileSection = document.getElementById('fileSection');
    const singleSection = document.getElementById('singleSection');
    const uploadTypeInputs = document.getElementsByName('upload_type');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    const toast = new bootstrap.Toast(document.getElementById('formToast'));

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

    // Enhanced form submission
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
            
            const formData = new FormData();
            formData.append('platform_email', form.platform_email.value);
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