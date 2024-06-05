import express from 'express';
import bodyParser from 'body-parser';
import allowCrossDomain from './middleware/allowCrossDomain';

import userRoutes from './routes/userRoutes';
import submissionRoutes from './routes/leaveSubmissionsRoutes';
import authRoutes from './routes/authRoutes';
import leaveType from './routes/leaveTypeRoutes'
import './jobs/updateLeaveAllowance';
import User from './db/models/userModel';
import dotenv from 'dotenv'
import leaveHistory from './routes/leaveHistory';


const app = express();

User.initializeAssociations();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(allowCrossDomain);

app.use('/auth', authRoutes)
app.use('/users', userRoutes);
app.use('/submissions', submissionRoutes)
app.use('/leave-types', leaveType)
app.use('/leave-history', leaveHistory)



const ip = process.env.IP || '0,0,0,0';
const port = parseInt(process.env.PORT || '3000', 10)
app.listen(port, ip, () => {
  console.log(`Server is running on http://${ip}:${port}`);
});