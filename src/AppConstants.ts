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
            NOT_FOUND: 'leave type not found',
            CREATE_SUCCES: 'leave type created successfully',
            UPDATE_SUCCES: 'Leave type data updated successfully',
            DELETE_SUCCES: 'Leave type deleted successfully'
        },
        Other: {
            NO_TOKEN: 'No token provided',
            INVALID_SORT: 'Invalid sort_by or sort_field',
            ERROR_DETAIL: 'Error detail',
            INTERNAL_SERVER_ERROR: 'Internal server error'
        },
        Attachment: {
            NO_FILE: 'No file uploaded',
            UPLOAD_DIRECTORY_NOT_DEFINED: 'UPLOAD directory is not defined in environment variables',
            ERROR_DELETING_FILE: 'Error while deleting old file:',
            UPDATE_ERROR: 'Error while updating attachment:',
            UPDATE_SUCCES: 'Attachment updated successfully',
            ERROR_SENDING_FILE: 'Error while sending file:',
            NOT_FOUND: 'File not found',
        },
        Auth: {
            INCORRECT_PASSWORD: 'Incorrect password',
            CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
            ERROR_CONFIRM_PASSWORD: 'New password and confirm password do not match',
            CHANGE_PASSWORD_SUCCES: 'Password changed successfully',
            EMAIL_IS_REQUIRED: 'Email is required',
            SEND_PASSWORD_RESET_LINK: 'Password reset link sent to email',
            RESET_TOKEN_INVALID: 'Password reset token is invalid or has expired',
            RESET_PASSWORD_SUCCES: 'Password has been reset'

        }
    }
  };
  
  export default AppConstants;