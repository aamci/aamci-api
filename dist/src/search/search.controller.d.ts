export declare class SearchController {
    doctors(q?: string, city?: string): {
        id: string;
        name: string;
        specialty: string;
        city: string;
        hospital: string;
    }[];
}
