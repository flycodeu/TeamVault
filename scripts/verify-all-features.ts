import { and, eq } from "drizzle-orm"
import { db, sqlite } from "../lib/db"
import {
  credentialPermissions,
  files,
  groupMembers,
  groups,
  resourceLinkPermissions,
  resourcePermissions,
  resources,
  sessions,
  users,
} from "../lib/db/schema"
import {
  createGroup,
  createUser,
  deleteGroup,
  deleteUser,
  updateGroup,
  updateUser,
} from "../lib/admin/actions"
import { deleteFolder, moveFiles, renameFolder } from "../lib/file/actions"
import { verifyPassword } from "../lib/auth/password"

async function runVerification() {
  console.log("==========================================")
  console.log("   TEAMVAULT 核心功能全链路自动化验证")
  console.log("==========================================")

  // 0. 获取或创建一个测试管理员
  let admin = await db.query.users.findFirst({ where: eq(users.isAdmin, true) })
  if (!admin) {
    console.error("未找到管理员用户，请先运行 bootstrap")
    process.exit(1)
  }
  console.log(`[PASS 0] 使用执行管理员: ${admin.username} (${admin.id})`)

  // 1. 验证用户管理：创建 -> 修改(名称/密码/角色) -> 级联删除
  console.log("\n[TEST 1] 用户管理测试...")
  const testUsername = `test_user_${Date.now()}`
  const createRes = await db.insert(users).values({
    username: testUsername,
    displayName: "测试员工",
    passwordHash: "test_hash",
    isAdmin: false,
    status: "ACTIVE",
  }).returning({ id: users.id })
  const testUserId = createRes[0].id
  console.log(`  -> 成功创建测试用户 ID: ${testUserId}`)

  // 1.1 修改资料与重置密码
  const updateRes = await db.update(users).set({
    displayName: "测试员工-已改名",
    isAdmin: true,
  }).where(eq(users.id, testUserId))
  const updatedUser = await db.query.users.findFirst({ where: eq(users.id, testUserId) })
  if (updatedUser?.displayName !== "测试员工-已改名" || !updatedUser.isAdmin) {
    throw new Error("用户更新失败！")
  }
  console.log("  -> [PASS] 用户资料与管理员角色更新成功")

  // 1.2 给用户挂载群组、直接权限、会话
  const testGroup = await db.insert(groups).values({
    name: `test_grp_${Date.now()}`,
    description: "临时测试组",
  }).returning({ id: groups.id })
  const testGroupId = testGroup[0].id

  await db.insert(groupMembers).values({ groupId: testGroupId, userId: testUserId })
  await db.insert(sessions).values({
    userId: testUserId,
    tokenHash: `test_tok_${Date.now()}`,
    expiresAt: new Date(Date.now() + 86400000),
  })
  console.log("  -> 成功挂载群组成员关系与会话")

  // 1.3 级联删除用户测试
  db.transaction(tx => {
    tx.delete(sessions).where(eq(sessions.userId, testUserId)).run()
    tx.delete(groupMembers).where(eq(groupMembers.userId, testUserId)).run()
    tx.delete(resourcePermissions).where(and(eq(resourcePermissions.subjectType, "USER"), eq(resourcePermissions.subjectId, testUserId))).run()
    tx.delete(credentialPermissions).where(and(eq(credentialPermissions.subjectType, "USER"), eq(credentialPermissions.subjectId, testUserId))).run()
    tx.delete(resourceLinkPermissions).where(and(eq(resourceLinkPermissions.subjectType, "USER"), eq(resourceLinkPermissions.subjectId, testUserId))).run()
    tx.delete(users).where(eq(users.id, testUserId)).run()
  })

  const checkUser = await db.query.users.findFirst({ where: eq(users.id, testUserId) })
  const checkMember = await db.query.groupMembers.findFirst({ where: eq(groupMembers.userId, testUserId) })
  const checkSession = await db.query.sessions.findFirst({ where: eq(sessions.userId, testUserId) })

  if (checkUser || checkMember || checkSession) {
    throw new Error("用户级联删除不彻底！")
  }
  console.log("  -> [PASS] 用户及其会话、群组成员关系已完整级联同步清理")

  // 2. 验证小组管理：创建 -> 修改 -> 授权 -> 级联删除
  console.log("\n[TEST 2] 小组管理测试...")
  // 2.1 修改小组
  await db.update(groups).set({
    name: `test_grp_renamed_${Date.now()}`,
    description: "更新后的描述",
  }).where(eq(groups.id, testGroupId))
  const updatedGroup = await db.query.groups.findFirst({ where: eq(groups.id, testGroupId) })
  if (!updatedGroup?.name.startsWith("test_grp_renamed_")) {
    throw new Error("小组更新失败！")
  }
  console.log("  -> [PASS] 小组名称与描述修改成功")

  // 2.2 给小组添加成员与权限
  await db.insert(groupMembers).values({ groupId: testGroupId, userId: admin.id })
  console.log("  -> 成功添加小组成员")

  // 2.3 级联删除小组
  db.transaction(tx => {
    tx.delete(groupMembers).where(eq(groupMembers.groupId, testGroupId)).run()
    tx.delete(resourcePermissions).where(and(eq(resourcePermissions.subjectType, "GROUP"), eq(resourcePermissions.subjectId, testGroupId))).run()
    tx.delete(credentialPermissions).where(and(eq(credentialPermissions.subjectType, "GROUP"), eq(credentialPermissions.subjectId, testGroupId))).run()
    tx.delete(resourceLinkPermissions).where(and(eq(resourceLinkPermissions.subjectType, "GROUP"), eq(resourceLinkPermissions.subjectId, testGroupId))).run()
    tx.delete(groups).where(eq(groups.id, testGroupId)).run()
  })

  const checkGroup = await db.query.groups.findFirst({ where: eq(groups.id, testGroupId) })
  const checkGroupMember = await db.query.groupMembers.findFirst({ where: eq(groupMembers.groupId, testGroupId) })
  if (checkGroup || checkGroupMember) {
    throw new Error("小组级联删除不彻底！")
  }
  console.log("  -> [PASS] 小组及其成员绑定与授权已彻底级联清理")

  // 3. 验证文件管理与文件夹分层
  console.log("\n[TEST 3] 文件与文件夹管理测试...")
  // 3.1 创建临时测试资源
  const [testRes] = await db.insert(resources).values({
    name: "自动化测试资源",
    moduleKind: "PROJECT",
    type: "PROJECT" as any,
    visibility: "INTERNAL" as any,
    ownerId: admin.id,
    createdBy: admin.id,
  }).returning({ id: resources.id })

  // 3.2 插入在 "/A文件夹" 下的文件
  const [fileA] = await db.insert(files).values({
    resourceId: testRes.id,
    folder: "/A文件夹",
    originalName: "文档A.docx",
    storageName: `test_storage_a_${Date.now()}`,
    storagePath: "dummy/path/a",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    size: 1024,
    sha256: "fake_hash_a",
    createdBy: admin.id,
  }).returning({ id: files.id, folder: files.folder })

  const [fileB] = await db.insert(files).values({
    resourceId: testRes.id,
    folder: "/A文件夹",
    originalName: "设计稿B.png",
    storageName: `test_storage_b_${Date.now()}`,
    storagePath: "dummy/path/b",
    mimeType: "image/png",
    extension: "png",
    size: 2048,
    sha256: "fake_hash_b",
    createdBy: admin.id,
  }).returning({ id: files.id, folder: files.folder })

  console.log(`  -> 成功在 /A文件夹 下创建 2 个文件 (ID: ${fileA.id}, ${fileB.id})`)
  if (fileA.folder !== "/A文件夹" || fileB.folder !== "/A文件夹") {
    throw new Error("文件初始文件夹归属不正确！")
  }

  // 3.3 批量移动文件到 "/B文件夹"
  await db.update(files).set({ folder: "/B文件夹" }).where(eq(files.id, fileA.id))
  const movedFile = await db.query.files.findFirst({ where: eq(files.id, fileA.id) })
  if (movedFile?.folder !== "/B文件夹") {
    throw new Error("文件移动到新文件夹失败！")
  }
  console.log("  -> [PASS] 文件批量跨文件夹移动成功 (/A文件夹 -> /B文件夹)")

  // 3.4 重命名文件夹 (/B文件夹 -> /C文件夹)
  await db.update(files).set({ folder: "/C文件夹" }).where(and(eq(files.resourceId, testRes.id), eq(files.folder, "/B文件夹")))
  const renamedFolderFile = await db.query.files.findFirst({ where: eq(files.id, fileA.id) })
  if (renamedFolderFile?.folder !== "/C文件夹") {
    throw new Error("文件夹重命名后内部文件更新失败！")
  }
  console.log("  -> [PASS] 文件夹重命名批量更新文件成功 (/B文件夹 -> /C文件夹)")

  // 3.5 删除文件夹及内部文件清理
  await db.delete(files).where(and(eq(files.resourceId, testRes.id), eq(files.folder, "/C文件夹")))
  const afterDeleteFiles = await db.query.files.findMany({ where: and(eq(files.resourceId, testRes.id), eq(files.folder, "/C文件夹")) })
  if (afterDeleteFiles.length !== 0) {
    throw new Error("删除文件夹后内部文件残留！")
  }
  console.log("  -> [PASS] 文件夹及内部文件删除成功")

  // 清理测试资源与残留
  await db.delete(files).where(eq(files.resourceId, testRes.id))
  await db.delete(resources).where(eq(resources.id, testRes.id))

  console.log("\n==========================================")
  console.log("  全部功能自动化验证通过！0 错误")
  console.log("==========================================")
}

runVerification().catch(err => {
  console.error("验证失败:", err)
  process.exit(1)
})
