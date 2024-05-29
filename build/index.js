"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const allowCrossDomain_1 = __importDefault(require("./middleware/allowCrossDomain"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const leaveSubmissionsRoutes_1 = __importDefault(require("./routes/leaveSubmissionsRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const leaveTypeRoutes_1 = __importDefault(require("./routes/leaveTypeRoutes"));
require("./jobs/updateLeaveAllowance");
const userModel_1 = __importDefault(require("./db/models/userModel"));
const app = (0, express_1.default)();
userModel_1.default.initializeAssociations();
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(allowCrossDomain_1.default);
app.use('/auth', authRoutes_1.default);
app.use('/users', userRoutes_1.default);
app.use('/submissions', leaveSubmissionsRoutes_1.default);
app.use('/leave-types', leaveTypeRoutes_1.default);
app.get('/api', (req, res) => {
    res.json({ message: 'Ini adalah response dari API' });
});
const ip = process.env.IP || '0,0,0,0';
const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, ip, () => {
    console.log(`Server is running on http://${ip}:${port}`);
});
