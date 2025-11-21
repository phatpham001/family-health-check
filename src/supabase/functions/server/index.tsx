import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Đăng ký tài khoản mới
app.post('/make-server-541782ba/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password và tên là bắt buộc' }, 400);
    }

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await kv.get(`user:${email}`);
    if (existingUser) {
      return c.json({ error: 'Email đã được đăng ký' }, 400);
    }

    // Tạo user trong Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Tự động xác nhận email
    });

    if (authError) {
      console.log('Lỗi khi tạo user trong Supabase Auth:', authError);
      return c.json({ error: authError.message }, 400);
    }

    // Tạo family group cho user
    const familyGroupId = `family_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Lưu thông tin user
    await kv.set(`user:${email}`, {
      id: authData.user.id,
      email,
      name,
      familyGroupId,
      createdAt: new Date().toISOString()
    });

    // Tạo family group
    await kv.set(`family:${familyGroupId}`, {
      id: familyGroupId,
      name: `Gia đình ${name}`,
      ownerId: authData.user.id,
      ownerEmail: email,
      memberIds: [],
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      message: 'Đăng ký thành công',
      user: { email, name, familyGroupId }
    });
  } catch (error) {
    console.log('Lỗi khi đăng ký:', error);
    return c.json({ error: 'Lỗi server khi đăng ký' }, 500);
  }
});

// Lấy thông tin user hiện tại
app.get('/make-server-541782ba/me', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const userData = await kv.get(`user:${user.email}`);
    
    if (!userData) {
      return c.json({ error: 'Không tìm thấy thông tin user' }, 404);
    }

    return c.json({ user: userData });
  } catch (error) {
    console.log('Lỗi khi lấy thông tin user:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Lấy thông tin family group
app.get('/make-server-541782ba/family', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const userData = await kv.get(`user:${user.email}`);
    
    if (!userData || !userData.familyGroupId) {
      return c.json({ error: 'Không tìm thấy nhóm gia đình' }, 404);
    }

    const familyData = await kv.get(`family:${userData.familyGroupId}`);
    
    return c.json({ family: familyData });
  } catch (error) {
    console.log('Lỗi khi lấy thông tin family:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Thêm thành viên mới
app.post('/make-server-541782ba/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const { name, relationship } = await c.req.json();
    
    if (!name) {
      return c.json({ error: 'Tên thành viên là bắt buộc' }, 400);
    }

    const userData = await kv.get(`user:${user.email}`);
    
    if (!userData || !userData.familyGroupId) {
      return c.json({ error: 'Không tìm thấy nhóm gia đình' }, 404);
    }

    const memberId = `member_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const memberData = {
      id: memberId,
      name,
      relationship: relationship || '',
      familyGroupId: userData.familyGroupId,
      createdAt: new Date().toISOString()
    };

    await kv.set(`member:${memberId}`, memberData);

    // Cập nhật family group
    const familyData = await kv.get(`family:${userData.familyGroupId}`);
    familyData.memberIds = [...(familyData.memberIds || []), memberId];
    await kv.set(`family:${userData.familyGroupId}`, familyData);

    return c.json({ member: memberData });
  } catch (error) {
    console.log('Lỗi khi thêm thành viên:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Lấy danh sách thành viên
app.get('/make-server-541782ba/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const userData = await kv.get(`user:${user.email}`);
    
    if (!userData || !userData.familyGroupId) {
      return c.json({ error: 'Không tìm thấy nhóm gia đình' }, 404);
    }

    const familyData = await kv.get(`family:${userData.familyGroupId}`);
    const memberIds = familyData?.memberIds || [];

    const members = await kv.mget(memberIds.map(id => `member:${id}`));

    return c.json({ members: members.filter(m => m !== null) });
  } catch (error) {
    console.log('Lỗi khi lấy danh sách thành viên:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Xóa thành viên
app.delete('/make-server-541782ba/members/:memberId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const memberId = c.req.param('memberId');
    const userData = await kv.get(`user:${user.email}`);
    
    if (!userData || !userData.familyGroupId) {
      return c.json({ error: 'Không tìm thấy nhóm gia đình' }, 404);
    }

    // Xóa member
    await kv.del(`member:${memberId}`);

    // Cập nhật family group
    const familyData = await kv.get(`family:${userData.familyGroupId}`);
    familyData.memberIds = familyData.memberIds.filter(id => id !== memberId);
    await kv.set(`family:${userData.familyGroupId}`, familyData);

    return c.json({ message: 'Đã xóa thành viên' });
  } catch (error) {
    console.log('Lỗi khi xóa thành viên:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Tạo health check
app.post('/make-server-541782ba/health-checks', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const { memberId, status, note, temperature, bloodPressure } = await c.req.json();
    
    if (!memberId || !status) {
      return c.json({ error: 'Thiếu thông tin bắt buộc' }, 400);
    }

    const today = new Date().toISOString().split('T')[0];
    const healthCheckId = `healthcheck_${memberId}_${today}_${Date.now()}`;

    const healthCheckData = {
      id: healthCheckId,
      memberId,
      status,
      note: note || '',
      temperature: temperature || null,
      bloodPressure: bloodPressure || null,
      date: today,
      timestamp: new Date().toISOString()
    };

    await kv.set(`healthcheck:${healthCheckId}`, healthCheckData);

    return c.json({ healthCheck: healthCheckData });
  } catch (error) {
    console.log('Lỗi khi tạo health check:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Lấy health checks theo member
app.get('/make-server-541782ba/health-checks/:memberId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const memberId = c.req.param('memberId');
    
    // Lấy tất cả health checks cho member này
    const allHealthChecks = await kv.getByPrefix(`healthcheck:healthcheck_${memberId}_`);
    
    // Sắp xếp theo timestamp mới nhất
    const sortedChecks = allHealthChecks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ healthChecks: sortedChecks });
  } catch (error) {
    console.log('Lỗi khi lấy health checks:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Tạo note/chú ý
app.post('/make-server-541782ba/notes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const { content, type } = await c.req.json();
    
    if (!content) {
      return c.json({ error: 'Nội dung là bắt buộc' }, 400);
    }

    const userData = await kv.get(`user:${user.email}`);
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const noteData = {
      id: noteId,
      familyGroupId: userData.familyGroupId,
      content,
      type: type || 'general',
      createdBy: userData.name,
      createdAt: new Date().toISOString()
    };

    await kv.set(`note:${noteId}`, noteData);

    return c.json({ note: noteData });
  } catch (error) {
    console.log('Lỗi khi tạo note:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// Lấy danh sách notes
app.get('/make-server-541782ba/notes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Chưa đăng nhập' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Token không hợp lệ' }, 401);
    }

    const userData = await kv.get(`user:${user.email}`);
    
    // Lấy tất cả notes
    const allNotes = await kv.getByPrefix('note:note_');
    
    // Lọc notes của family group
    const familyNotes = allNotes
      .filter(note => note.familyGroupId === userData.familyGroupId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ notes: familyNotes });
  } catch (error) {
    console.log('Lỗi khi lấy notes:', error);
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

Deno.serve(app.fetch);
