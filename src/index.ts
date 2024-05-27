import express from 'express';
import bodyParser from 'body-parser';
import allowCrossDomain from './middleware/allowCrossDomain';

import userRoutes from './routes/userRoutes';
import submissionRoutes from './routes/leaveSubmissionsRoutes';
import authRoutes from './routes/authRoutes';
import leaveType from './routes/leaveTypeRoutes'
import './jobs/updateLeaveAllowance';
import User from './db/models/userModel';


const app = express();

User.initializeAssociations();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(allowCrossDomain);

app.use('/auth', authRoutes)
app.use('/users', userRoutes);
app.use('/submissions', submissionRoutes)
app.use('/leave-types', leaveType)


const ip = '192.168.10.40'
const port = 3000 ;
app.listen(port, ip, () => {
  console.log(`Server is running on ${ip}:${port}`);
});