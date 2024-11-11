document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dncForm');
    const fileSection = document.getElementById('fileSection');
    const singleSection = document.getElementById('singleSection');
    const uploadTypeInputs = document.getElementsByName('upload_type');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    
    // Toggle between file and single entry sections
    uploadTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'file') {
                fileSection.classList.remove('d-none');
                singleSection.classList.add('d-none');
            } else {
                fileSection.classList.add('d-none');
                singleSection.classList.remove('d-none');
            }
        });
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
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
                formData.append('file', document.getElementById('file').files[0]);
            } else {
                formData.append('single_entry', document.getElementById('single_entry_input').value);
            }

            const submission = await fetch('/submit-blocklist', {
                method: 'POST',
                body: formData
            });
            
            const result = await submission.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Success - redirect
            window.location.href = result.redirect_url;

        } catch (error) {
            alert(`Error: ${error.message}`);
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
});
