"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowCrossDomain = (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
};
exports.default = allowCrossDomain;
