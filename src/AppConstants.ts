const AppConstants = {
    Role: {
        HR: 'hr',
    },
    Status: {
        PENDING: 'Pending',
        DITERIMA: 'Diterima',
        DITOLAK: 'Ditolak',
    },
    Gender: {
        MALE: 'male',
        FEMALE: 'female'
    },
    ErrorMessages: {
        Submission: {
            ERROR_FETCHING_SUBMISSIONS: 'Error while fetching submissions:',
            UNABLE_FETCH_SUBMISSIONS: 'Unable to fetch submissions',
            SUBMISSION_NOT_FOUND: 'Submission not found',
            SUBMISSIONS_CREATED_SUCCES: 'Leave submission created successfully',
            SUBMISSIONS_UPDATE_SUCCES: 'Submission data updated successfully',
            SUBMISSION_ALREADY_REJECTED: 'Submission has already been rejected',
            SUBMISSION_ALREADY_ACCEPTED: 'Submission has already been accepted',
            SUBMISSION_DELETE_SUCCES: 'User deleted successfully',
            INVALID_MONTH_OR_YEAR: 'Invalid month or year'
        },
        User: {
            USER_NOT_FOUND: 'user not found',
            USER_UPDATE_SUCCES: 'User updated successfully',
            USER_DELETE_SUCCES: 'User deleted successfully'
        },
        LeaveAllowance: {
            LEAVE_ALLOWANCE_NOT_FOUND: 'leave allowance not found',
            JATAH_CUTI_TIDAK_CUKUP: 'Jatah cuti tidak cukup',
        },
        LeaveType: {
            LEAVE_TYPE_NOT_FOUND: 'leave type not found',
            ERROR_FETCHING: 'Error while fetching users:',
            UNABLE_FETCH: 'Unable to fetch users'
        },
        Other: {
            NO_TOKEN: 'No token provided',
            INVALID_SORT: 'Invalid sort_by or sort_field',
        },
        Attachment: {
            NO_FILE: 'No file uploaded',
            FAILED_TO_UPLOAD: 'Failed to upload file',
            UPLOAD_DIRECTORY_NOT_DEFINED: 'UPLOAD directory is not defined in environment variables',
            ERROR_DELETING_FILE: 'Error while deleting old file:',
            UPDATE_ERROR: 'Error while updating attachment:',
            UPDATE_SUCCES: 'Attachment updated successfully',
            ERROR_SENDING_FILE: 'Error while sending file:',
            NOT_FOUND: 'File not found',
            ERROR_FETCH: 'Error while fetching attachment:',
            UNABLE_FETCH: 'Unable to fetch attachment'
        },
        Auth: {
            INCORRECT_PASSWORD: 'Incorrect password',
            ERROR_LOGIN: 'Error during login:',
            UNABLE_LOGIN: 'Unable to process login',
            CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
            ERROR_CONFIRM_PASSWORD: 'New password and confirm password do not match',
            CHANGE_PASSWORD_SUCCES: 'Password changed successfully',
            ERROR_CHAGING_PASSWORD: 'Error changing password:',
            UNABLE_CHANGING_PASSWORD: 'Unable to changing password',
            EMAIL_IS_REQUIRED: 'Email is required',
            SEND_PASSWORD_RESET_LINK: 'Password reset link sent to email',
            ERROR_REQUEST_RESET_PASSWORD: 'Error during password reset request:',
            UNABLE_TO_REQUEST_RESET_PASSWORD: 'Unable to process password reset request',
            RESET_TOKEN_INVALID: 'Password reset token is invalid or has expired',
            RESET_PASSWORD_SUCCES: 'Password has been reset'

        }
    }
  };
  
  export default AppConstants;