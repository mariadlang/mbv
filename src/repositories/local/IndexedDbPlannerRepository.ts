import Dexie, { type Table } from "dexie";
import { createEmptySnapshot } from "@/src/domain/planner";
import type {
  Goal,
  Habit,
  HabitLog,
  JournalEntry,
  LifeArea,
  Milestone,
  MoodLog,
  PlannerSnapshot,
  Profile,
  Task,
} from "@/src/domain/planner";
import type { PlannerRepository } from "../interfaces/PlannerRepository";

interface MetadataRecord {
  key: "planner";
  schemaVersion: 1;
  updatedAt: string;
}

class PlannerDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  lifeAreas!: Table<LifeArea, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  tasks!: Table<Task, string>;
  goals!: Table<Goal, string>;
  milestones!: Table<Milestone, string>;
  moodLogs!: Table<MoodLog, string>;
  journalEntries!: Table<JournalEntry, string>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super("my-best-version-planner");
    this.version(1).stores({
      profiles: "id",
      lifeAreas: "id, active, order",
      habits: "id, status, lifeAreaId, goalId",
      habitLogs: "id, habitId, date, [habitId+date]",
      tasks: "id, status, date, goalId, lifeAreaId",
      goals: "id, status, priority, lifeAreaId",
      milestones: "id, goalId, status",
      moodLogs: "id, date",
      journalEntries: "id, date, type, status",
      metadata: "key",
    });
  }
}

export class IndexedDbPlannerRepository implements PlannerRepository {
  private readonly db = new PlannerDatabase();

  async load(): Promise<PlannerSnapshot> {
    const metadata = await this.db.metadata.get("planner");
    if (!metadata) return createEmptySnapshot();

    const [profiles, lifeAreas, habits, habitLogs, tasks, goals, milestones, moodLogs, journalEntries] =
      await Promise.all([
        this.db.profiles.toArray(),
        this.db.lifeAreas.orderBy("order").toArray(),
        this.db.habits.toArray(),
        this.db.habitLogs.toArray(),
        this.db.tasks.toArray(),
        this.db.goals.toArray(),
        this.db.milestones.toArray(),
        this.db.moodLogs.toArray(),
        this.db.journalEntries.toArray(),
      ]);

    return {
      schemaVersion: 1,
      profile: profiles[0] ?? null,
      lifeAreas,
      habits,
      habitLogs,
      tasks,
      goals,
      milestones,
      moodLogs,
      journalEntries,
    };
  }

  async replace(snapshot: PlannerSnapshot): Promise<void> {
    await this.db.transaction("rw", this.db.tables, async () => {
      await Promise.all(this.db.tables.map((table) => table.clear()));
      if (snapshot.profile) await this.db.profiles.add(snapshot.profile);
      if (snapshot.lifeAreas.length) await this.db.lifeAreas.bulkAdd(snapshot.lifeAreas);
      if (snapshot.habits.length) await this.db.habits.bulkAdd(snapshot.habits);
      if (snapshot.habitLogs.length) await this.db.habitLogs.bulkAdd(snapshot.habitLogs);
      if (snapshot.tasks.length) await this.db.tasks.bulkAdd(snapshot.tasks);
      if (snapshot.goals.length) await this.db.goals.bulkAdd(snapshot.goals);
      if (snapshot.milestones.length) await this.db.milestones.bulkAdd(snapshot.milestones);
      if (snapshot.moodLogs.length) await this.db.moodLogs.bulkAdd(snapshot.moodLogs);
      if (snapshot.journalEntries.length) await this.db.journalEntries.bulkAdd(snapshot.journalEntries);
      await this.db.metadata.add({
        key: "planner",
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  async clear(): Promise<void> {
    await this.db.transaction("rw", this.db.tables, async () => {
      await Promise.all(this.db.tables.map((table) => table.clear()));
    });
  }
}
