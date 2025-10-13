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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const demoDoctors = [
    { id: 'doc-1', name: 'Dr. A. Dupont', specialty: 'Cardiologie', city: 'Paris', hospital: 'Montparnasse' },
    { id: 'doc-2', name: 'Dr. B. Martin', specialty: 'Dermatologie', city: 'Paris', hospital: 'Saint-Louis' },
    { id: 'doc-3', name: 'Dr. C. Diallo', specialty: 'Pédiatrie', city: 'Lyon', hospital: 'Lumières' },
];
let SearchController = class SearchController {
    doctors(q, city) {
        console.log('SearchController.doctors', { q, city });
        const list = demoDoctors.filter(d => (!q || d.name.toLowerCase().includes((q || '').toLowerCase())) &&
            (!city || d.city.toLowerCase().includes((city || '').toLowerCase())));
        return Array.isArray(list) ? list : [];
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('doctors'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "doctors", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('search')
], SearchController);
