import React from 'react';
import {Search} from 'lucide-react';


export default function SidebarSearch({value, onChange}) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
            <input
                type="text"
                placeholder="Tìm kiếm..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
        </div>
    );
}