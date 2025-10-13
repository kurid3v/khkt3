import { getProblemById, getSubmissions, getUsers } from '@/lib/data';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import ProblemDetailView from './ProblemDetailView';

export default async function ProblemDetailPage({ params }: { params: { problemId: string } }) {
    
    const problem = await getProblemById(params.problemId);
    
    if (!problem) {
        notFound();
    }
    
    // Fetch all data required by the page on the server
    const currentUser = await getCurrentUser();
    const allSubmissions = await getSubmissions();
    const allUsers = await getUsers();
    
    const problemSubmissions = allSubmissions
        .filter(s => s.problemId === problem.id)
        .sort((a, b) => b.submittedAt - a.submittedAt);
        
    const teacher = allUsers.find(u => u.id === problem.createdBy);

    return (
        <ProblemDetailView
            problem={problem}
            problemSubmissions={problemSubmissions}
            users={allUsers}
            currentUser={currentUser}
            teacherName={teacher?.name || 'Không rõ'}
        />
    );
};
