import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getUserTodos } from "@/lib/actions/todos";
import { TodoListClient } from "@/components/todos/TodoListClient";
import { redirect } from "next/navigation";

export default async function TodosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userRole = (session.user as any)?.role || "contributor";
  const userName = session.user.name || "User";
  const isAdmin = userRole === "admin";

  const [todosRes, allUsers] = await Promise.all([
    getUserTodos(),
    isAdmin
      ? db.query.users.findMany({
          columns: { id: true, name: true, email: true, role: true },
          orderBy: [users.name],
        })
      : Promise.resolve([]),
  ]);

  const initialTodos = todosRes.success && todosRes.todos ? todosRes.todos : [];

  return (
    <TodoListClient
      initialTodos={initialTodos}
      currentUserId={userId}
      currentUserName={userName}
      currentUserRole={userRole}
      isAdmin={isAdmin}
      allUsers={allUsers}
    />
  );
}
