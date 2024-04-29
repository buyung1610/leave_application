import { Request, Response } from "express";
import LeaveSubmission from "../db/models/leaveSubmissionModel";
import LeaveAllowance from "../db/models/leaveAllowanceModel";

const leaveSubmissionController = {
    getAllSubmission: async (req: Request, res: Response) => {
      try {
            // Mengambil semua data dari tabel User
            const submissions = await LeaveSubmission.findAll();
            res.status(200).json(submissions);
      } catch (error) {
            // Menangani kesalahan jika terjadi
            console.error('Error while fetching submissions:', error);
            res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },

    createSubmission: async (req: Request, res: Response) => {
      try {
        const { start_date, end_date, dropdown_type, emergency_call, description, created_at, created_by } = req.body;
        const { user_id } = req.body

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const timeDifference = endDate.getTime() - startDate.getTime();
        const numberOfDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

        // Check leave allowance
        const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id } });
        if (!leaveAllowance || leaveAllowance.total_days === 0) {
            throw new Error('Jatah cuti tidak cukup');
        }

        // Create leave submission
        const leaveSubmission = await LeaveSubmission.create({
          leave_type_id: dropdown_type,
          total_days: numberOfDays,
          start_date: start_date,
          end_date: end_date,
          emergency_call,
          description,
          created_at, 
          created_by: user_id
      });

        res.status(201).json({ message: 'Leave submission created successfully', data: leaveSubmission });
      } catch (error) {
        res.status(500).json({ error: error});
      }
    },

    getSubmissionById: async (req: Request, res: Response) => {
      try{
        const submissionId = req.params.id;
        const submission = await LeaveSubmission.findByPk(submissionId);
        if (submission) {
          res.status(200).json(submission);
        } else {
          res.status(404).json({ error: 'submission not found' })
        }
      } catch (error) {
        console.error('Error while fetching submission by id:', error);
        res.status(500).json({ error: 'Unable to fetch submission' });
      }
    },

    getSubmissionByStatus: async (req: Request, res: Response) => {
      try{
        const submissionId = req.params.status;
        const submission = await LeaveSubmission.findByPk(submissionId);
        if (submission) {
          res.status(200).json(submission);
        } else {
          res.status(404).json({ error: 'submission not found' })
        }
      } catch (error) {
        console.error('Error while fetching submission by id:', error);
        res.status(500).json({ error: 'Unable to fetch submission' });
      }
    },

    updateSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
        const { start_date, end_date, dropdown_type, emergency_call, description, user_id } = req.body

        const [updateSubmission] = await LeaveSubmission.update({
          start_date,
          end_date,
          leave_type_id: dropdown_type,
          emergency_call,
          description,
          updated_at: new Date(),
          updated_by: user_id
        }, {where: { id: submissionId }}); 

        if (updateSubmission === 0) {
          res.status(404).json({ error: 'Submission not found' });
        } else {
          res.status(200).json({ message: 'Submission data updated successfully' });
        }
      } catch (error) {
        console.error('Error while updating submission data:', error);
        res.status(500).json({ error: 'Unable to update submission data' });
      }
    },

    updateSubmissionStatus: async (req: Request, res: Response) => {
      try {
        const id = req.params.id;
        const { buttonClicked, user_id } = req.body;
    
        const [updatedRowsCount] = await LeaveSubmission.update({ 
          status: buttonClicked.status,
          approver_user_id: user_id
        }, { where: { id: id } });
    
        if (updatedRowsCount === 0) {
          res.status(404).json({ error: 'Leave submission not found' });
        } else {
          if (buttonClicked.status === 'diterima') {
            // Dapatkan userId terkait dengan pengajuan cuti
            const leaveSubmission = await LeaveSubmission.findByPk(id);
            if (!leaveSubmission) {
              res.status(404).json({ error: 'Leave submission not found' });
              return;
            }
    
            const userId = leaveSubmission.user_id;
    
            // Kurangi jatah cuti di leave_allowance
            const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: userId } });
            if (!leaveAllowance) {
              res.status(500).json({ error: 'Leave allowance not found' });
              return;
            }
    
            await leaveAllowance.update({ total_days: (leaveAllowance.total_days ?? 0) - 1 });
    
            res.status(200).json({ message: 'User updated successfully' });
          } else {
            res.status(200).json({ message: 'Application for leave was successfully rejected' });
          }
        }
      } catch (error) {
        console.error('Error while updating submission status:', error);
        res.status(500).json({ error: 'Unable to update submission status' });
      }
    },    

    deleteSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
  
        // Hapus pengguna
        const deletedRowsCount = await LeaveSubmission.destroy({ where: { id: submissionId } });
  
        if (deletedRowsCount === 0) {
          res.status(404).json({ error: 'submission not found' });
        } else {
          res.status(200).json({ message: 'submission deleted successfully' });
        }
      } catch (error) {
        console.error('Error while deleting user:', error);
        res.status(500).json({ error: 'Unable to delete submission' });
      }
    }
} 

export default leaveSubmissionController