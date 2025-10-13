"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    constructor(users, jwt) {
        this.users = users;
        this.jwt = jwt;
    }
    async register(email, password, role = 'PATIENT') {
        const exists = await this.users.findByEmail(email);
        if (exists)
            throw new common_1.UnauthorizedException('Email already registered');
        const user = await this.users.create(email, password, role);
        return this.sign(user.id, user.email, user.role);
    }
    async login(email, password) {
        const user = await this.users.findByEmail(email);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await this.users.validatePassword(user.password, password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return this.sign(user.id, user.email, user.role);
    }
    sign(sub, email, role) {
        const access_token = this.jwt.sign({ sub, email, role });
        return { access_token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService, jwt_1.JwtService])
], AuthService);
