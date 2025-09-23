import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Star, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const BookingPage = () => {
    const { guideId } = useParams();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        service: '',
        date: '',
        time: '',
        duration: '2',
        guests: '1',
        notes: '',
        contact: {
            name: '',
            email: '',
            phone: '',
            passportId: ''
        },
        payment: {
            method: 'card',
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            billingAddress: ''
        }
    });

    const guide = {
        name: "Elena Popova",
        location: "Prague, Czech Republic",
        rating: 4.9,
        reviews: 127,
        avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop",
        services: [
            { name: "Historical Tour Guide", price: 30 },
            { name: "Photography Services", price: 45 },
            { name: "Cultural Experience", price: 25 },
            { name: "Food & Drink Tour", price: 35 }
        ]
    };

    const selectedService =
        guide.services.find((s) => s.name === bookingData.service) || guide.services[0];

    const totalPrice = (selectedService?.price || 0) * parseInt(bookingData.duration || '0', 10);
    const serviceFee = Math.round(totalPrice * 0.1);
    const finalTotal = totalPrice + serviceFee;

    const handleInputChange = (section, field, value) => {
        if (section === 'contact' || section === 'payment') {
            setBookingData((prev) => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        } else {
            setBookingData((prev) => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleNext = () => {
        if (currentStep < 3) setCurrentStep((s) => s + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((s) => s - 1);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Simulate booking process
        toast.loading('Processing your booking...');

        setTimeout(() => {
            toast.dismiss();
            toast.success('Booking confirmed! Elena will contact you shortly.');
            navigate('/dashboard/tourist');
        }, 2000);
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-8">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                                        step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {step < currentStep ? <CheckCircle className="h-6 w-6" /> : step}
                                </div>
                                <span className="ml-2 text-sm font-medium">
                  {step === 1 && 'Service Details'}
                                    {step === 2 && 'Contact Info'}
                                    {step === 3 && 'Payment'}
                </span>
                                {step < 3 && <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Booking Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <form onSubmit={handleSubmit}>
                                {/* Step 1: Service Details */}
                                {currentStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Service & Schedule</h2>

                                        {/* Service Selection */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Choose Service</label>
                                            <div className="space-y-3">
                                                {guide.services.map((service) => (
                                                    <label key={service.name} className="block">
                                                        <input
                                                            type="radio"
                                                            name="service"
                                                            value={service.name}
                                                            checked={bookingData.service === service.name}
                                                            onChange={(e) => handleInputChange('', 'service', e.target.value)}
                                                            className="mr-3"
                                                            required
                                                        />
                                                        <span className="text-gray-900">{service.name}</span>
                                                        <span className="text-blue-600 font-medium ml-2">${service.price}/hour</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Date Selection */}
                                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <Calendar className="inline h-4 w-4 mr-1" />
                                                    Preferred Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={bookingData.date}
                                                    onChange={(e) => handleInputChange('', 'date', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <Clock className="inline h-4 w-4 mr-1" />
                                                    Preferred Time
                                                </label>
                                                <select
                                                    value={bookingData.time}
                                                    onChange={(e) => handleInputChange('', 'time', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Select time</option>
                                                    <option value="09:00">9:00 AM</option>
                                                    <option value="10:00">10:00 AM</option>
                                                    <option value="11:00">11:00 AM</option>
                                                    <option value="14:00">2:00 PM</option>
                                                    <option value="15:00">3:00 PM</option>
                                                    <option value="16:00">4:00 PM</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Duration and Guests */}
                                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                                                <select
                                                    value={bookingData.duration}
                                                    onChange={(e) => handleInputChange('', 'duration', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="1">1 hour</option>
                                                    <option value="2">2 hours</option>
                                                    <option value="3">3 hours</option>
                                                    <option value="4">4 hours</option>
                                                    <option value="6">6 hours</option>
                                                    <option value="8">8 hours (full day)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
                                                <select
                                                    value={bookingData.guests}
                                                    onChange={(e) => handleInputChange('', 'guests', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                                        <option key={num} value={num}>
                                                            {num} guest{num > 1 ? 's' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Special Notes */}
                                        <div className="mb-8">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Special Requests or Notes
                                            </label>
                                            <textarea
                                                value={bookingData.notes}
                                                onChange={(e) => handleInputChange('', 'notes', e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                rows={4}
                                                placeholder="Any specific requirements or questions for your guide..."
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 2: Contact Information */}
                                {currentStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

                                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                                <input
                                                    type="text"
                                                    value={bookingData.contact.name}
                                                    onChange={(e) => handleInputChange('contact', 'name', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                                                <input
                                                    type="email"
                                                    value={bookingData.contact.email}
                                                    onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                                <input
                                                    type="tel"
                                                    value={bookingData.contact.phone}
                                                    onChange={(e) => handleInputChange('contact', 'phone', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Passport ID (Optional)
                                                    <span className="text-xs text-gray-500 block">For international travelers</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bookingData.contact.passportId}
                                                    onChange={(e) => handleInputChange('contact', 'passportId', e.target.value)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-medium mb-1">Your information is secure</p>
                                                    <p>
                                                        We use bank-level encryption to protect your personal data. Your information will only be
                                                        shared with your selected guide for service coordination.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 3: Payment */}
                                {currentStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>

                                        {/* Payment Methods */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                                            <div className="space-y-3">
                                                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="card"
                                                        checked={bookingData.payment.method === 'card'}
                                                        onChange={(e) => handleInputChange('payment', 'method', e.target.value)}
                                                        className="mr-3"
                                                    />
                                                    <CreditCard className="h-5 w-5 mr-3 text-gray-600" />
                                                    <span>Credit/Debit Card</span>
                                                </label>
                                                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="paypal"
                                                        checked={bookingData.payment.method === 'paypal'}
                                                        onChange={(e) => handleInputChange('payment', 'method', e.target.value)}
                                                        className="mr-3"
                                                    />
                                                    <div className="w-5 h-5 mr-3 bg-blue-600 rounded"></div>
                                                    <span>PayPal</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Card Details */}
                                        {bookingData.payment.method === 'card' && (
                                            <div className="space-y-4 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                                    <input
                                                        type="text"
                                                        placeholder="1234 5678 9012 3456"
                                                        value={bookingData.payment.cardNumber}
                                                        onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                                        <input
                                                            type="text"
                                                            placeholder="MM/YY"
                                                            value={bookingData.payment.expiryDate}
                                                            onChange={(e) => handleInputChange('payment', 'expiryDate', e.target.value)}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                                                        <input
                                                            type="text"
                                                            placeholder="123"
                                                            value={bookingData.payment.cvv}
                                                            onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                                                <div className="text-sm text-green-800">
                                                    <p className="font-medium mb-1">Secure Escrow Payment</p>
                                                    <p>
                                                        Your payment is held securely until your service is completed. This protects both you and
                                                        your guide.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex justify-between pt-6">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className={`px-6 py-3 rounded-lg transition-colors ${
                                            currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                        disabled={currentStep === 1}
                                    >
                                        Back
                                    </button>

                                    {currentStep < 3 ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                        >
                                            Confirm Booking
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Booking Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>

                            {/* Guide Info */}
                            <div className="flex items-center space-x-3 mb-6 pb-6 border-b">
                                <img src={guide.avatar} alt={guide.name} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <h4 className="font-medium text-gray-900">{guide.name}</h4>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                                        <span>
                      {guide.rating} ({guide.reviews} reviews)
                    </span>
                                    </div>
                                    <p className="text-sm text-gray-600 flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {guide.location}
                                    </p>
                                </div>
                            </div>

                            {/* Service Details */}
                            <div className="space-y-3 mb-6">
                                {bookingData.service && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Service</span>
                                        <span className="font-medium">{bookingData.service}</span>
                                    </div>
                                )}
                                {bookingData.date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date</span>
                                        <span className="font-medium">{bookingData.date}</span>
                                    </div>
                                )}
                                {bookingData.time && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Time</span>
                                        <span className="font-medium">{bookingData.time}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Duration</span>
                                    <span className="font-medium">{bookingData.duration} hours</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Guests</span>
                                    <span className="font-medium">{bookingData.guests}</span>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="space-y-2 mb-4 pb-4 border-b">
                                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Service ({bookingData.duration}h × ${selectedService?.price || 0})
                  </span>
                                    <span>${totalPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Service fee</span>
                                    <span>${serviceFee}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span className="text-blue-600">${finalTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
