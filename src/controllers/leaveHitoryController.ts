import { Request, Response } from "express";
import LeaveSubmission from "../db/models/leaveSubmissionModel";
import { Op } from "sequelize";
import User from "../db/models/userModel";


const leaveHistoryController = {
    getLeaveHistory: async (req: Request, res: Response) => {
        try {
            const { month, year, page, limit } = req.query;
            const sort_by = req.query.sort_by as string || 'asc';
            const sort_field = req.query.sort_field as string || 'userId';
    
            // Validate query parameters
            if (typeof month !== 'string' || typeof year !== 'string') {
                return res.status(400).json({ error: 'Invalid query parameters' });
            }
    
            const monthNum = parseInt(month); // Konversi month menjadi number
            const yearNum = parseInt(year); // Konversi year menjadi number
    
            if (isNaN(monthNum) || isNaN(yearNum)) {
                return res.status(400).json({ error: 'Invalid query parameters' });
            }
    
            const startDate = new Date(yearNum, monthNum - 1, 1);
            const endDate = new Date(yearNum, monthNum, 0);
    
            // Query pengajuan cuti dari database
            const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
                where: {
                    [Op.or]: [
                        { start_date: { [Op.between]: [startDate, endDate] } }, // Pengecekan untuk cuti yang dimulai dan berakhir di dalam bulan yang diminta
                        { start_date: { [Op.lt]: startDate }, end_date: { [Op.gte]: startDate } }, // Pengecekan untuk cuti yang dimulai sebelum bulan yang diminta dan berlanjut ke bulan tersebut
                        { start_date: { [Op.lt]: endDate }, end_date: { [Op.gte]: endDate } } // Pengecekan untuk cuti yang dimulai di bulan yang diminta dan berlanjut ke bulan berikutnya
                    ],
                    is_deleted: 0,
                    status: "diterima"
                },
                include: [User] // Sertakan model User untuk mendapatkan informasi pengguna
            });
    
            const calculateWorkingDays = (start: Date, end: Date): number => {
                let totalDays = 0;
                let currentDate = new Date(start);
    
                while (currentDate <= end) {
                    const dayOfWeek = currentDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
                        totalDays++;
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
    
                return totalDays;
            };
    
            // Array untuk menyimpan total cuti setiap bulan untuk setiap karyawan
            const leaveSummary: { userId: number; name: string; totalLeaveDays: number }[] = [];
    
            // Simpan daftar pengguna yang telah diproses
            const processedUsers: string[] = [];
    
            leaveSubmissions.forEach((submission: LeaveSubmission) => {
                const start = new Date(submission.start_date);
                const end = new Date(submission.end_date);
    
                const user = submission.User; // Dapatkan objek pengguna dari relasi
    
                if (user) { // Pastikan objek pengguna ada
                    const userId = user.id;
                    const userName = user.name;
    
                    let totalLeaveDays = 0;
    
                    if (start < startDate && end > endDate) {
                        totalLeaveDays = calculateWorkingDays(startDate, endDate);
                    } else if (start < startDate && end <= endDate) {
                        totalLeaveDays = calculateWorkingDays(startDate, end);
                    } else if (start >= startDate && end > endDate) {
                        totalLeaveDays = calculateWorkingDays(start, endDate);
                    } else {
                        totalLeaveDays = submission.total_days;
                    }
    
                    // Cek apakah pengguna sudah ada dalam leaveSummary
                    const existingUserIndex = leaveSummary.findIndex(summary => summary.name === userName);
                    if (existingUserIndex !== -1) {
                        // Jika sudah ada, tambahkan total cuti baru ke total cuti yang sudah ada
                        leaveSummary[existingUserIndex].totalLeaveDays += totalLeaveDays;
                    } else {
                        // Jika belum ada, tambahkan informasi cuti baru sebagai objek baru dalam array
                        leaveSummary.push({ userId, name: userName, totalLeaveDays });
                    }
    
                    // Tandai pengguna telah diproses
                    processedUsers.push(userName);
                } else {
                    console.error('Invalid user data:', submission.User);
                }
            });
    
            // Cek pengguna yang tidak memiliki cuti dan tambahkan ke leaveSummary
            const allUsers = await User.findAll(); // Ambil semua pengguna dari database
            allUsers.forEach(user => {
                if (!processedUsers.includes(user.name)) {
                    leaveSummary.push({ userId: user.id, name: user.name, totalLeaveDays: 0 });
                }
            });
    
            // Sorting
            if (typeof sort_field === 'string' && typeof sort_by === 'string') {
              if (sort_field === 'userId' || sort_field === 'totalLeaveDays') {
                  leaveSummary.sort((a, b) => {
                      if (sort_by === 'asc') {
                          return a[sort_field] - b[sort_field];
                      } else {
                          return b[sort_field] - a[sort_field];
                      }
                  });
              } else {
                  console.error('Invalid sort field:', sort_field);
              }
            }
    
            // Pagination
            const pageNum = page ? parseInt(page as string) : 1;
            const limitNum = limit ? parseInt(limit as string) : leaveSummary.length;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedLeaveSummary = leaveSummary.slice(startIndex, endIndex);
    
            res.status(200).json(paginatedLeaveSummary);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Unable to fetch total leave days' });
        }
    },
     
    getMonthlyLeaveChart: async (req: Request, res: Response) => {
        try {
          const { year, limit, page } = req.query;
          const sort_by = req.query.sort_by as string || 'asc';
          const sort_field = req.query.sort_field as string || 'month';
      
          // Validasi query parameter
          if (typeof year !== 'string') {
            return res.status(400).json({ error: 'Invalid query parameters' });
          }
      
          const yearNum = parseInt(year);
      
          if (isNaN(yearNum)) {
            return res.status(400).json({ error: 'Invalid query parameters' });
          }
      
          const calculateWorkingDays = (start: Date, end: Date): number => {
            let totalDays = 0;
            let currentDate = new Date(start);
      
            while (currentDate <= end) {
              const dayOfWeek = currentDate.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Minggu, 6 = Sabtu
                totalDays++;
              } else if (currentDate.getDate() === 31) {
                  totalDays++;
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
      
            return totalDays;
          };
      
          // Array untuk menyimpan total cuti setiap bulan
          const monthlyLeaveSummary = Array(12).fill(0);
      
          for (let month = 0; month < 12; month++) {
            const startDate = new Date(yearNum, month, 1);
            const endDate = new Date(yearNum, month + 1, 1);
            endDate.setDate(endDate.getDate() - 1);
      
            // Query pengajuan cuti dari database
            const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
              where: {
                [Op.or]: [
                  { start_date: { [Op.between]: [startDate, endDate] } },
                  { start_date: { [Op.lt]: startDate }, end_date: { [Op.gte]: startDate } },
                  { start_date: { [Op.lt]: endDate }, end_date: { [Op.gte]: endDate } }
                ],
                is_deleted: 0,
                status: "diterima"
              }
            });
      
            let totalLeaveDays = 0;
      
            leaveSubmissions.forEach((submission: LeaveSubmission) => {
              const start = new Date(submission.start_date);
              const end = new Date(submission.end_date);
      
              if (start < startDate && end > endDate) {
                totalLeaveDays += calculateWorkingDays(startDate, endDate);
              } else if (start < startDate && end <= endDate) {
                totalLeaveDays += calculateWorkingDays(startDate, end);
              } else if (start >= startDate && end > endDate) {
                totalLeaveDays += calculateWorkingDays(start, endDate);
              } else {
                totalLeaveDays += calculateWorkingDays(start, end);
              }
            });
      
            monthlyLeaveSummary[month] = totalLeaveDays;
          }
      
          const monthNames = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
          ];
      
          let response = monthNames.map((month, index) => ({
            month,
            totalLeaveDays: monthlyLeaveSummary[index]
          }));
      
          // Sorting
          if (sort_field && sort_by) {
            response = response.sort((a, b) => {
              if (sort_field === 'month') {
                if (sort_by === 'asc') {
                  return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
                } else {
                  return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
                }
              } else if (sort_field === 'totalLeaveDays') {
                if (sort_by === 'asc') {
                  return a.totalLeaveDays - b.totalLeaveDays;
                } else {
                  return b.totalLeaveDays - a.totalLeaveDays;
                }
              }
              return 0;
            });
          }
      
          // Pagination
          const limitNum = limit ? parseInt(limit as string) : response.length;
          const pageNum = page ? parseInt(page as string) : 1;
          const startIndex = (pageNum - 1) * limitNum;
          const endIndex = startIndex + limitNum;
          const paginatedResponse = response.slice(startIndex, endIndex);
      
          res.status(200).json({
            year: yearNum,
            totalEntries: response.length,
            page: pageNum,
            limit: limitNum,
            monthlyLeaveSummary: paginatedResponse
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Unable to fetch total leave days' });
        }
    },
}

export default leaveHistoryController