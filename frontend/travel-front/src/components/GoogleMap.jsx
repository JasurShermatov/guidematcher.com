import React from 'react';
import { Navigation } from 'lucide-react';

export default function GoogleMap({ guides = [], className = '' }) {
    return (
        <div className={`bg-gray-100 dark:bg-dark-800 rounded-lg overflow-hidden ${className}`}>
            {/* Map Header */}
            <div className="bg-white dark:bg-dark-900 p-4 border-b border-gray-200 dark:border-dark-700">
                <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Guide Locations</h3>
                </div>
            </div>

            {/* Map Area */}
            <div className="relative h-80 bg-gradient-to-br from-blue-50 to-green-50 dark:from-dark-800 dark:to-dark-700 overflow-hidden">
                {/* Map Grid Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" className="text-gray-400 dark:text-gray-600">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Streets/Roads */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600 opacity-60"></div>
                    <div className="absolute top-2/3 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600 opacity-60"></div>
                    <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600 opacity-60"></div>
                    <div className="absolute left-2/3 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600 opacity-60"></div>
                </div>

                {/* Guide Markers - Squared Layout */}
                {guides.slice(0, 8).map((guide, index) => {
                    const positions = [
                        { left: '20%', top: '25%' },
                        { left: '45%', top: '20%' },
                        { left: '70%', top: '30%' },
                        { left: '25%', top: '50%' },
                        { left: '55%', top: '45%' },
                        { left: '75%', top: '60%' },
                        { left: '30%', top: '75%' },
                        { left: '60%', top: '70%' }
                    ];
                    const position = positions[index] || { left: '50%', top: '50%' };

                    return (
                        <div
                            key={guide.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                            style={{ left: position.left, top: position.top }}
                        >
                            {/* Square Guide Marker */}
                            <div className="relative">
                                <div className="w-12 h-12 bg-white dark:bg-dark-900 border-2 border-blue-500 rounded-lg shadow-lg group-hover:scale-110 transition-all duration-200 overflow-hidden">
                                    <img
                                        src={guide.image}
                                        alt={guide.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                parent.innerHTML = `<div class="w-full h-full bg-blue-500 flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg></div>`;
                                            }
                                        }}
                                    />
                                </div>

                                {/* Price Badge */}
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                                    ${guide.price}
                                </div>

                                {/* Rating Badge */}
                                <div className="absolute -bottom-2 -left-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center">
                                    ★ {guide.rating}
                                </div>
                            </div>

                            {/* Tooltip */}
                            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                <div className="font-medium">{guide.name}</div>
                                <div className="text-gray-300">{guide.location}</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                            </div>
                        </div>
                    );
                })}

                {/* Center Location Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>

                {/* Map Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    <button className="bg-white dark:bg-dark-900 p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-dark-700">
                        <span className="text-lg font-bold text-gray-600 dark:text-gray-300">+</span>
                    </button>
                    <button className="bg-white dark:bg-dark-900 p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-dark-700">
                        <span className="text-lg font-bold text-gray-600 dark:text-gray-300">−</span>
                    </button>
                </div>

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 bg-white dark:bg-dark-900 p-3 rounded-lg shadow-md border border-gray-200 dark:border-dark-700">
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 border border-white rounded"></div>
                            <span className="text-gray-600 dark:text-gray-300">Guides</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-gray-600 dark:text-gray-300">Your Location</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Footer */}
            <div className="bg-white dark:bg-dark-900 p-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-dark-700">
                <div className="flex items-center justify-between">
                    <span>Showing {guides.length} guides in this area</span>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-blue-500 border border-white rounded"></div>
                            <span>Available guides</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Current location</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
