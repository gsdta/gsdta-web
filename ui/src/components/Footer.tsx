import Link from "next/link";

export function Footer() {
    return (
        <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-black/40">
            <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GSD Tamil Academy</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        குழந்தைகளுக்கான தமிழ்ப் பயிற்சி—சீரான பாடத்திட்டம், அன்பான கற்றல் சூழல்.
                    </p>
                </div>
                <nav>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">விரைவு இணைப்புகள்</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                        <li><Link className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100" href="/classes">வகுப்புகள்</Link></li>
                        <li><Link className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100" href="/enrollment">சேர்க்கை</Link></li>
                        <li><Link className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100" href="/dashboard">டாஷ்போர்டு</Link></li>
                    </ul>
                </nav>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">தொடர்பு</h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <li><a className="hover:text-gray-900 dark:hover:text-gray-100" href="mailto:info@school.org">info@school.org</a></li>
                        <li>சான் ஹோசே, கெலிபோர்னியா</li>
                        <li className="flex gap-3 pt-1">
                            <a aria-label="Instagram" className="hover:text-gray-900 dark:hover:text-gray-100" href="#">Instagram</a>
                            <span aria-hidden>•</span>
                            <a aria-label="YouTube" className="hover:text-gray-900 dark:hover:text-gray-100" href="#">YouTube</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} GSD Tamil Academy. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.
            </div>
        </footer>
    );
}
