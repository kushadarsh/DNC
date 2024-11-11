document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dncForm');
    const fileSection = document.getElementById('fileSection');
    const singleSection = document.getElementById('singleSection');
    const uploadTypeInputs = document.getElementsByName('upload_type');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    const toast = new bootstrap.Toast(document.getElementById('formToast'));
    
    // Show toast message
    function showToast(message, type = 'info') {
        const toastEl = document.getElementById('formToast');
        const icon = toastEl.querySelector('.toast-header i');
        icon.setAttribute('data-feather', type === 'error' ? 'alert-circle' : 'info');
        feather.replace();
        toastEl.querySelector('.toast-body').textContent = message;
        toast.show();
    }

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

    // Email validation feedback
    const emailInput = document.getElementById('platform_email');
    const emailStatus = document.getElementById('email-status');
    
    emailInput.addEventListener('input', function() {
        const checkIcon = emailStatus.querySelector('.text-success');
        const xIcon = emailStatus.querySelector('.text-danger');
        
        if (this.checkValidity() && this.value) {
            checkIcon.classList.remove('d-none');
            xIcon.classList.add('d-none');
        } else if (this.value) {
            checkIcon.classList.add('d-none');
            xIcon.classList.remove('d-none');
        } else {
            checkIcon.classList.add('d-none');
            xIcon.classList.add('d-none');
        }
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
            const emailVerification = await verifyEmail();
            if (!emailVerification.success) {
                throw new Error(emailVerification.error);
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

    async function verifyEmail() {
        const formData = new FormData();
        formData.append('platform_email', document.getElementById('platform_email').value);
        
        const response = await fetch('/verify-email', {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }

    // Initialize feather icons
    feather.replace();
});
