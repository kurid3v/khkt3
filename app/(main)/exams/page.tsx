import { getExams, getProblems, getUsers } from '@/lib/data';
import { getCurrentUser } from '@/lib/session';
import ExamsView from './ExamsView';

export default async function ExamsPage() {
    // --- SERVER COMPONENT LOGIC ---
    // Fetch all necessary data on the server.
    const currentUser = await getCurrentUser();
    const exams = await getExams();
    const problems = await getProblems();

    if (!currentUser) {
        // This should be handled by layout, but as a safeguard.
        return <p>Vui lòng đăng nhập...</p>;
    }
    
    // Pass the server-fetched data as props to the client component.
    return (
        <ExamsView 
            initialExams={exams} 
            problems={problems} 
            currentUser={currentUser} 
        />
    );
}
