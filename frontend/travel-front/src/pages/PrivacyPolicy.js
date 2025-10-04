// src/pages/PrivacyPolicy.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
    const updatedAt = "October 4, 2025";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last updated: {updatedAt}
                    </p>
                </header>

                <div className="bg-white dark:bg-dark-900 rounded-xl shadow-sm border border-gray-200 dark:border-dark-800 p-6 space-y-8">
                    <section>
                        <p className="text-gray-700 dark:text-gray-300">
                            UzGuide (“we”, “our”, or “us”) values your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Information We Collect
                        </h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                            <li>Contact details: name, email address, phone number</li>
                            <li>Messages you submit through our contact form</li>
                            <li>Basic usage data such as pages visited and general device/browser info</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                            <li>To respond to inquiries and provide customer support</li>
                            <li>To provide quotes and logistics or guide-booking services you request</li>
                            <li>To improve our website experience and service quality</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Sharing of Information
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            We do not sell your personal information. We may share information with trusted service providers who assist in operating our website and conducting our business (for example, email delivery providers, analytics, or payment processors), under confidentiality obligations. These providers are permitted to use your information only to perform services for us.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Data Retention
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            We retain personal information only as long as necessary to fulfill the purposes outlined in this policy unless a longer retention period is required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Your Choices
                        </h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                            <li>You may request access, correction, or deletion of your personal information.</li>
                            <li>You may opt out of non-essential communications at any time.</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 mt-2">
                            To exercise your rights, contact us using the details in the{" "}
                            <a href="#contact" className="text-blue-600 dark:text-blue-400 underline">Contact Us</a> section below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Security
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            We implement reasonable physical, administrative, and technical safeguards designed to protect your information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Children’s Privacy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            Our services are not directed to children under 13, and we do not knowingly collect personal information from children.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            International Users
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            If you access our website from outside Uzbekistan, you understand your information may be processed in countries where our service providers operate. Data protection laws in those jurisdictions may differ from your own.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Changes to This Policy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300">
                            We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised “Last updated” date. If the changes are material, we may provide additional notice (e.g., a banner or email).
                        </p>
                    </section>

                    <section id="contact">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Contact Us
                        </h2>
                        <div className="text-gray-700 dark:text-gray-300 space-y-1">
                            <p><span className="font-medium">Email:</span> <a className="text-blue-600 dark:text-blue-400 underline" href="mailto:info@uzguide.com">info@uzguide.com</a></p>
                            <p><span className="font-medium">Phone:</span> +998 90 123 45 67</p>
                            <p><span className="font-medium">Address:</span> Tashkent, Uzbekistan</p>
                        </div>
                    </section>

                    <section className="pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            For details about cookies, please see our{" "}
                            <Link to="/cookies" className="underline text-blue-600 dark:text-blue-400">Cookie Policy</Link>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
