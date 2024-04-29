import * as cron from 'cron';
import User from '../db/models/userModel'; 
import LeaveAllowance from '../db/models/leaveAllowanceModel';


const job = new cron.CronJob('0 0 1 1 *', async () => {
    try {
        const usersWithLeaveAllowance = await User.findAll({
            include: [LeaveAllowance], 
        });

        for (const user of usersWithLeaveAllowance) {
            const joinDate = new Date(user.join_date); 
            const currentDate = new Date(); 

            const diffYears = currentDate.getFullYear() - joinDate.getFullYear();
            const diffMonths = diffYears * 12 + (currentDate.getMonth() - joinDate.getMonth());

            let leaveAllowance = 0;
            if (diffMonths >= 72) {
                leaveAllowance = 17;
            } else if (diffMonths >= 60) {
                leaveAllowance = 16;
            } else if (diffMonths >= 48) {
                leaveAllowance = 15;
            } else if (diffMonths >= 36) {
                leaveAllowance = 14;
            } else if (diffMonths >= 24) {
                leaveAllowance = 13;
            } else if (diffMonths >= 12) {
                leaveAllowance = 12;
            }

            await LeaveAllowance.update(
                { total_days: leaveAllowance },
                { where: { user_id: user.id } } 
            );
        }

        console.log('Sisa cuti tahunan berhasil diperbarui');
    } catch (error) {
        console.error('Error:', error);
    }
});

job.start();