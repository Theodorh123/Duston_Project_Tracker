import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, projects, entities } from "@/lib/db/schema";
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

  const [todosRes, allUsers, allEntities, allProjects] = await Promise.all([
    getUserTodos(),
    isAdmin
      ? db.query.users.findMany({
          columns: { id: true, name: true, email: true, role: true },
          orderBy: [users.name],
        })
      : Promise.resolve([]),
    db.query.entities.findMany({
      columns: { id: true, name: true, brandPrimaryColor: true },
      orderBy: [asc(entities.name)],
    }),
    db.query.projects.findMany({
      columns: { id: true, name: true, entityId: true },
      orderBy: [asc(projects.name)],
    }),
  ]);

  const initialTodos = todosRes.success && todosRes.todos ? todosRes.todos : [];
  const mappedEntities = allEntities.map((e) => ({
    id: e.id,
    name: e.name,
    brandPrimaryColor: e.brandPrimaryColor || "#023542",
  }));
  const mappedProjects = allProjects.map((p) => ({
    id: p.id,
    name: p.name,
    entityId: p.entityId,
  }));

  return (
    <TodoListClient
      initialTodos={initialTodos}
      entities={mappedEntities}
      projects={mappedProjects}
      currentUserId={userId}
      currentUserName={userName}
      currentUserRole={userRole}
      isAdmin={isAdmin}
      allUsers={allUsers}
    />
  );
}
