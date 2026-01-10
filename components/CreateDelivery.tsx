
import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Delivery, DeliveryStatus, PaymentStatus, Role, CustomerInfo } from '../types';

const CreateDelivery: React.FC = () => {
    const { currentUser, setDeliveries } = useContext(AppContext);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newDelivery: Delivery = {
            id: `del-${Date.now()}`,
            customer: {
                id: `cust-${Date.now()}`,
                name: formData.get('customerName') as string,
                phone: formData.get('customerPhone') as string,
            },
            pickupAddress: formData.get('pickupAddress') as string,
            dropoffAddress: formData.get('dropoffAddress') as string,
            packageNotes: formData.get('packageNotes') as string,
            status: DeliveryStatus.Pending,
            paymentStatus: PaymentStatus.Unpaid,
            price: 1500 + Math.floor(Math.random() * 10) * 150, // Mock price calculation
            createdAt: new Date(),
        };
        setDeliveries(prev => [newDelivery, ...prev]);
        e.currentTarget.reset();
        setIsExpanded(false);
    };

    if (!isExpanded) {
        return (
             <div className="flex justify-center mb-6">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:-translate-y-1"
                >
                    Create New Delivery
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">New Delivery Order</h2>
                <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 font-semibold text-gray-700">Customer Details</div>
                <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-600">Full Name</label>
                    <input type="text" name="customerName" id="customerName" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                 <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-600">Phone Number</label>
                    <input type="tel" name="customerPhone" id="customerPhone" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div className="md:col-span-2 font-semibold text-gray-700 pt-2">Delivery Details</div>
                <div>
                    <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-600">Pickup Address (Asaba)</label>
                    <input type="text" name="pickupAddress" id="pickupAddress" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 123 Okpanam Road" />
                </div>
                <div>
                    <label htmlFor="dropoffAddress" className="block text-sm font-medium text-gray-600">Drop-off Address (Asaba)</label>
                    <input type="text" name="dropoffAddress" id="dropoffAddress" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 456 Nnebisi Road"/>
                </div>
                 <div className="md:col-span-2">
                    <label htmlFor="packageNotes" className="block text-sm font-medium text-gray-600">Package Details / Notes</label>
                    <textarea name="packageNotes" id="packageNotes" rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., Fragile item, call on arrival"></textarea>
                </div>

                <div className="md:col-span-2 flex justify-end items-center gap-4">
                    <p className="text-lg font-bold text-gray-700">Estimated Price: <span className="text-blue-600">~₦1,800</span></p>
                    <button type="submit" className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition duration-200">
                        Place Order
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateDelivery;
