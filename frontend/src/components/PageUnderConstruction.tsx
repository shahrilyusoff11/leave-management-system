import { Construction } from 'lucide-react';

const PageUnderConstruction = ({ title }: { title: string }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Construction className="h-8 w-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
            <p className="text-slate-500 max-w-md">
                This page is currently under development. Please check back later for updates.
            </p>
        </div>
    );
};

export default PageUnderConstruction;
