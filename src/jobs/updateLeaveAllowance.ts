import * as cron from 'cron';
import User from '../db/models/userModel'; 
import LeaveAllowance from '../db/models/leaveAllowanceModel';
import { Op } from "sequelize";


const job = new cron.CronJob('0 0 1 1 *', async () => {
    try {
        const usersWithLeaveAllowance = await User.findAll({
            where: {
                is_deleted: 0
            },
            include: [
                {
                  model: LeaveAllowance,
                  as: 'leaveAllowance',
                  attributes: ['total_days']
                }
            ],
        });

        for (const user of usersWithLeaveAllowance) {
            let leaveAllowance = 0;

            if (user.role === 'owner') {
                leaveAllowance = 365;
            } else {
                const joinDate = new Date(user.join_date); 
                const currentDate = new Date(); 
                const diffYears = currentDate.getFullYear() - joinDate.getFullYear();
                const diffMonths = diffYears * 12 + (currentDate.getMonth() - joinDate.getMonth());

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
            }

            // console.log(`User ${user.id} - Leave Allowance: ${leaveAllowance}`);
            await LeaveAllowance.update(
                { 
                    total_days: leaveAllowance, 
                    total_days_copy: leaveAllowance 
                },
                { where: { user_id: user.id } } 
            );
        }

        console.log('Sisa cuti tahunan berhasil diperbarui');
    } catch (error) {
        console.error('Error:', error);
    }
});

job.start();
