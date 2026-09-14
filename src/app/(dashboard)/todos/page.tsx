import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, projects } from "@/lib/db/schema";
import { getUserTodos } from "@/lib/actions/todos";
import { TodoListClient } from "@/components/todos/TodoListClient";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

export default async function TodosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userRole = (session.user as any)?.role || "contributor";
  const userName = session.user.name || "User";
  const isAdmin = userRole === "admin";

  const [todosRes, allUsers, allProjects] = await Promise.all([
    getUserTodos(),
    isAdmin
      ? db.query.users.findMany({
          columns: { id: true, name: true, email: true, role: true },
          orderBy: [users.name],
        })
      : Promise.resolve([]),
    db.query.projects.findMany({
      columns: { id: true, name: true, entityId: true },
      with: {
        entity: {
          columns: { id: true, name: true, brandPrimaryColor: true },
        },
      },
      orderBy: [asc(projects.name)],
    }),
  ]);

  const initialTodos = todosRes.success && todosRes.todos ? todosRes.todos : [];
  const mappedProjects = allProjects.map((p) => ({
    id: p.id,
    name: p.name,
    entityId: p.entityId,
    entityName: p.entity?.name || "",
    entityBrandColor: p.entity?.brandPrimaryColor || "#023542",
  }));

  return (
    <TodoListClient
      initialTodos={initialTodos}
      projects={mappedProjects}
      currentUserId={userId}
      currentUserName={userName}
      currentUserRole={userRole}
      isAdmin={isAdmin}
      allUsers={allUsers}
    />
  );
}
