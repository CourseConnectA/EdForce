import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Grid, IconButton, List, ListItemButton, ListItemText, ListSubheader, Menu, MenuItem, Snackbar, TextField, Divider, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon, Checkbox, useTheme, useMediaQuery, Drawer, Stack, Typography } from '@mui/material';
import { Star, StarBorder, MoreVert, FilterList as FilterListIcon, Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRowSelectionModel, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PageHeader from '@/components/common/PageHeader';
import reportsService, { ReportRow, ReportFolder } from '../../../services/reportsService';
import { RootState } from '../../../store/store';

const ReportHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isCounselor = userRole.includes('counselor');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'recent'|'mine'|'shared'|'all'|'categories'>('mine');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState<{ field: string; order: 'ASC'|'DESC' }>({ field: 'dateModified', order: 'DESC' });
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [selected, setSelected] = useState<GridRowSelectionModel>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<ReportRow | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState<{open:boolean;message:string;severity?:'success'|'error'|'info'|'warning'}>({open:false,message:''});
  const [colVis, setColVis] = useState<GridColumnVisibilityModel>({ description: true, folderId: true, createdBy: true, dateEntered: true });
  const [loading, setLoading] = useState<boolean>(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFolderId, setMoveFolderId] = useState<string>('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null|HTMLElement>(null);
  const [shareUserOpen, setShareUserOpen] = useState(false);
  const [shareUsers, setShareUsers] = useState<any[]>([]);
  const [shareUserIds, setShareUserIds] = useState<string[]>([]);
  const [shareUserSearch, setShareUserSearch] = useState<string>('');
  const [shareSearchTimer, setShareSearchTimer] = useState<any>(null);
  const [initialShareUserIds, setInitialShareUserIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { search, page, limit, sortBy: sort.field, sortOrder: sort.order };
      if (tab === 'mine') params.createdByMe = true;
      if (tab === 'shared') params.sharedWithMe = true;
      if (tab === 'all') params.all = true;
      if (tab === 'categories' && activeFolderId) params.category = activeFolderId;
      const res = await reportsService.list(params);
      setRows((res as any)?.data || []);
      setTotal((res as any)?.total || 0);
    } catch (e: any) {
      setToast({open:true,message:e?.message||'Failed to load reports',severity:'error'});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page, limit, sort, tab, activeFolderId]);
  const refreshFolders = async () => {
    try { const f = await reportsService.listFolders(); setFolders(f||[]); } catch {}
  };
  useEffect(() => { refreshFolders(); }, []);

  const onStar = async (r: ReportRow, starred: boolean) => {
    try { await reportsService.star(r.id, starred); fetchData(); } catch {}
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>, r: ReportRow) => { setMenuAnchor(e.currentTarget as HTMLElement); setMenuRow(r); setRenameValue(r.name); };
  const closeMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  const handleBulkDelete = async () => {
    try {
      for (const id of selected as string[]) await reportsService.remove(String(id));
      setSelected([]);
      fetchData();
      setToast({open:true,message:'Deleted selected reports',severity:'success'});
    } catch (e:any) {
      setToast({open:true,message:e?.message||'Delete failed',severity:'error'});
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'star', headerName: '', width: 50, sortable:false, renderCell: (p) => {
        const r = p.row as ReportRow;
        const me = (user as any)?.id;
        const isStar = Array.isArray(r.starredBy) && r.starredBy.includes(me);
        return (
          <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onStar(r, !isStar);}} aria-label="star">
            {isStar ? <Star color="warning" fontSize="small"/> : <StarBorder fontSize="small"/>}
          </IconButton>
        );
      }
    },
    { field: 'name', headerName: 'Report Name', flex:1, minWidth:200, renderCell: (p)=> {
      const r = p.row as ReportRow;
      return (
        <Box component="span" onClick={()=>navigate(`/reports/view/${r.id}`)} sx={{ color:'primary.main', textDecoration:'underline', cursor:'pointer' }}>
          {p.value}
        </Box>
      );
    } },
    { field: 'description', headerName: 'Description', flex:1, minWidth:200 },
    { field: 'folderId', headerName: 'Folder', width:160, valueGetter: (p) => folders.find(f=>f.id===p.value)?.name || '-' },
    { field: 'createdByFirstName', headerName: 'Created By', width:160, valueGetter:(p)=> p.row.createdByFirstName || p.row.createdByName || p.row.createdBy },
    { field: 'createdByType', headerName: 'Type', width:150, valueGetter:(p)=> p.row.createdByType || '' },
    { field: 'createdByCenter', headerName: 'Center Name', width:180, valueGetter:(p)=> p.row.createdByCenter || '-' },
    { field: 'dateEntered', headerName: 'Created On', width:160, valueGetter:(p)=> p.value ? new Date(p.value as string).toLocaleString(): '-' },
    { field: 'actions', headerName: 'Actions', width:80, sortable:false, filterable:false, renderCell: (p)=> (
      <IconButton size="small" onClick={(e)=>openMenu(e, p.row)}><MoreVert/></IconButton>
    ) },
  ], [folders, user]);

  return (
    <Box sx={{ px: isMobile ? 0 : 1 }}>
      {/* Mobile-optimized header */}
      {isMobile ? (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Reports</Typography>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/reports/new')}
            >
              New
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField 
              size="small" 
              placeholder="Search..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              sx={{ flex: 1 }}
              InputProps={{ sx: { fontSize: '0.85rem' } }}
            />
            <IconButton onClick={() => setSidebarOpen(true)} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <FilterListIcon />
            </IconButton>
          </Stack>
          {selected.length > 0 && (
            <Button 
              variant="outlined" 
              color="error" 
              size="small" 
              onClick={handleBulkDelete}
              sx={{ mt: 1 }}
              fullWidth
            >
              Delete Selected ({selected.length})
            </Button>
          )}
        </Box>
      ) : (
        <PageHeader
          title="Reports"
          subtitle={`${total} items`}
          actions={(
            <>
              <TextField size="small" placeholder="Search reports..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} />
              <Button variant="contained" onClick={()=>navigate('/reports/new')}>New Report</Button>
              {selected.length>0 && <Button variant="outlined" color="error" onClick={handleBulkDelete}>Delete Selected</Button>}
            </>
          )}
        />
      )}

      {/* Mobile sidebar drawer */}
      <Drawer 
        anchor="left" 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        PaperProps={{ sx: { width: '80vw', maxWidth: 300 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setSidebarOpen(false)} size="small" aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>
          <List dense>
            <ListItemButton selected={tab==='recent'} onClick={()=>{ setTab('recent'); setActiveFolderId(null); setPage(1); setSidebarOpen(false); }}>
              <ListItemText primary="Recent" />
            </ListItemButton>
            <ListItemButton selected={tab==='mine'} onClick={()=>{ setTab('mine'); setActiveFolderId(null); setPage(1); setSidebarOpen(false); }}>
              <ListItemText primary="Created by Me" />
            </ListItemButton>
            <ListItemButton selected={tab==='shared'} onClick={()=>{ setTab('shared'); setActiveFolderId(null); setPage(1); setSidebarOpen(false); }}>
              <ListItemText primary="Shared with Me" />
            </ListItemButton>
            {!isCounselor && (
              <ListItemButton selected={tab==='all'} onClick={()=>{ setTab('all'); setActiveFolderId(null); setPage(1); setSidebarOpen(false); }}>
                <ListItemText primary="All Reports" />
              </ListItemButton>
            )}
            <Divider sx={{ my: 1 }} />
            <ListSubheader>Folders</ListSubheader>
            <ListItemButton selected={tab==='categories' && !activeFolderId} onClick={()=>{ setTab('categories'); setActiveFolderId(null); setPage(1); setSidebarOpen(false); }}>
              <ListItemText primary="All Folders" />
            </ListItemButton>
            {(folders||[]).map((f)=> (
              <ListItemButton key={f.id} selected={activeFolderId===f.id} onClick={()=>{ setTab('categories'); setActiveFolderId(f.id); setPage(1); setSidebarOpen(false); }}>
                <ListItemText primary={f.name} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Grid container spacing={2}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <Grid item xs={12} md={3} lg={2}>
            <List
              subheader={<ListSubheader component="div">Reports</ListSubheader>}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <ListItemButton selected={tab==='recent'} onClick={()=>{ setTab('recent'); setActiveFolderId(null); setPage(1); }}>
                <ListItemText primary="Recent" />
              </ListItemButton>
              <ListItemButton selected={tab==='mine'} onClick={()=>{ setTab('mine'); setActiveFolderId(null); setPage(1); }}>
                <ListItemText primary="Created by Me" />
              </ListItemButton>
              <ListItemButton selected={tab==='shared'} onClick={()=>{ setTab('shared'); setActiveFolderId(null); setPage(1); }}>
                <ListItemText primary="Shared with Me" />
              </ListItemButton>
              {!isCounselor && (
                <ListItemButton selected={tab==='all'} onClick={()=>{ setTab('all'); setActiveFolderId(null); setPage(1); }}>
                  <ListItemText primary="All Reports" />
                </ListItemButton>
              )}
              <Divider />
              <ListSubheader component="div" sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <Box>Folders</Box>
                <IconButton size="small" onClick={()=>setCreateFolderOpen(true)} aria-label="new-folder">+</IconButton>
                {activeFolderId && (
                  <IconButton size="small" onClick={(e)=>setFolderMenuAnchor(e.currentTarget)} aria-label="folder-actions"><MoreVert/></IconButton>
                )}
              </ListSubheader>
              <ListItemButton selected={tab==='categories' && !activeFolderId} onClick={()=>{ setTab('categories'); setActiveFolderId(null); setPage(1); }}>
                <ListItemText primary="All Folders" />
              </ListItemButton>
              {(folders||[]).map((f)=> (
                <ListItemButton key={f.id} selected={activeFolderId===f.id} onClick={()=>{ setTab('categories'); setActiveFolderId(f.id); setPage(1); }}>
                  <ListItemText primary={f.name} />
                </ListItemButton>
              ))}
              <Divider />
              <ListSubheader component="div">Favorites</ListSubheader>
              <ListItemButton onClick={()=>{/* later: favorites filter */}}>
                <ListItemText primary="All Favorites" />
              </ListItemButton>
            </List>
          </Grid>
        )}
        <Grid item xs={12} md={isMobile ? 12 : 9} lg={isMobile ? 12 : 10}>
          {/* Mobile: Card view for reports */}
          {isMobile ? (
            <Box>
              {loading ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Loading...</Typography>
              ) : rows.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No reports found</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((r) => {
                    const me = (user as any)?.id;
                    const isStar = Array.isArray(r.starredBy) && r.starredBy.includes(me);
                    return (
                      <Box
                        key={r.id}
                        onClick={() => navigate(`/reports/view/${r.id}`)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          cursor: 'pointer',
                          '&:active': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); onStar(r, !isStar); }}
                            sx={{ mt: -0.5, ml: -0.5 }}
                          >
                            {isStar ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 0.25 }}>{r.name}</Typography>
                            {r.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }} noWrap>
                                {r.description}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {r.createdByFirstName || r.createdByName || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {r.dateEntered ? new Date(r.dateEntered).toLocaleDateString() : '-'}
                              </Typography>
                            </Stack>
                          </Box>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openMenu(e, r); }}>
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              {/* Mobile pagination */}
              {total > limit && (
                <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
                  <Button 
                    size="small" 
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Prev
                  </Button>
                  <Typography variant="body2" sx={{ py: 0.5 }}>
                    {page} / {Math.ceil(total / limit)}
                  </Typography>
                  <Button 
                    size="small"
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            /* Desktop: DataGrid view */
            <div style={{ height: 540, width:'100%' }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(r)=>r.id}
                disableRowSelectionOnClick
                loading={loading}
                paginationMode="server"
                rowCount={total}
                paginationModel={{ page: page-1, pageSize: limit }}
                onPaginationModelChange={(m)=>{ setPage(m.page+1); setLimit(m.pageSize);} }
                sortingMode="server"
                onSortModelChange={(m)=>{
                  const first = m?.[0];
                  if (first) setSort({ field: first.field, order: (first.sort || 'asc').toUpperCase() as 'ASC'|'DESC' });
                  else setSort({ field: 'dateModified', order: 'DESC' });
                }}
                checkboxSelection
                onRowSelectionModelChange={(m)=>setSelected(m)}
                onRowDoubleClick={(p)=>navigate(`/reports/view/${p.id}`)}
                columnVisibilityModel={colVis}
                onColumnVisibilityModelChange={(m)=>setColVis(m)}
                sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
              />
            </div>
          )}
        </Grid>
      </Grid>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={()=>{ if(menuRow){ navigate(`/reports/view/${menuRow.id}`); } closeMenu(); }}>View</MenuItem>
        <MenuItem onClick={()=>{ setRenameOpen(true); closeMenu(); }}>Rename</MenuItem>
        <MenuItem onClick={async()=>{ if(menuRow){ await reportsService.remove(menuRow.id); fetchData(); } closeMenu(); }}>Delete</MenuItem>
        <MenuItem onClick={()=>{ /* Export handled from view/run */ closeMenu(); }}>Export</MenuItem>
        {menuRow && (user as any)?.id === menuRow.createdBy && (
          <MenuItem onClick={()=>{ setMoveFolderId(menuRow?.folderId || ''); setMoveOpen(true); }}>
            Move to Folder…
          </MenuItem>
        )}
        
        <MenuItem onClick={async()=>{ try { if(menuRow){ setShareUserOpen(true); const users = await reportsService.listShareUsers('counselor'); const list = (users as any)?.data || users || []; setShareUsers(list);
          // Pre-check logic: if center-shared, check all counselors except excludedFromCenter; else check sharedTo
          const checked = Array.isArray(menuRow.sharedTo) ? menuRow.sharedTo : [];
          setShareUserIds(checked); setInitialShareUserIds(checked);
        } } catch(e:any){ setToast({open:true,message:e?.message||'Failed to load users',severity:'error'});} }}>Share to Users…</MenuItem>
      </Menu>
      <Menu anchorEl={folderMenuAnchor} open={!!folderMenuAnchor} onClose={()=>setFolderMenuAnchor(null)}>
        {(() => {
          const folder = folders.find(f=>f.id===activeFolderId);
          const canEdit = !!folder && ((folder.createdBy && folder.createdBy === (user as any)?.id) || (user as any)?.isAdmin);
          return (
            <>
              {canEdit && <MenuItem onClick={async()=>{ const newName = prompt('Folder name', folder?.name || ''); if(newName && activeFolderId){ try { await reportsService.updateFolder(activeFolderId,{ name:newName }); await refreshFolders(); setToast({open:true,message:'Folder renamed',severity:'success'}); } catch(e:any){ setToast({open:true,message:e?.message||'Rename failed',severity:'error'});} } }}>{'Rename Folder'}</MenuItem>}
              {canEdit && <MenuItem onClick={async()=>{ if(activeFolderId){ const ok = confirm('Delete folder? Reports will move to No Folder.'); if(ok){ try { await reportsService.deleteFolder(activeFolderId); setActiveFolderId(null); await refreshFolders(); await fetchData(); setToast({open:true,message:'Folder deleted',severity:'success'}); } catch(e:any){ setToast({open:true,message:e?.message||'Delete failed',severity:'error'});} } } folderMenuAnchor && setFolderMenuAnchor(null); }}>{'Delete Folder'}</MenuItem>}
              {!canEdit && <Box sx={{ px:2, py:1, color:'text.secondary' }}>No permissions</Box>}
            </>
          );
        })()}
      </Menu>

      <Dialog open={createFolderOpen} onClose={()=>setCreateFolderOpen(false)}>
        <DialogTitle>New Folder</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Folder Name" fullWidth size="small" value={createFolderName} onChange={(e)=>setCreateFolderName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setCreateFolderOpen(false)}>Cancel</Button>
          <Button onClick={async()=>{ if(!createFolderName.trim()) return; try { await reportsService.createFolder(createFolderName.trim()); setCreateFolderName(''); setCreateFolderOpen(false); await refreshFolders(); setTab('categories'); setToast({open:true,message:'Folder created',severity:'success'}); } catch(e:any){ setToast({open:true,message:e?.message||'Create failed',severity:'error'});} }}>Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={shareUserOpen} onClose={()=>{ setShareUserOpen(false); setShareUserIds([]); setShareUserSearch(''); }} fullWidth maxWidth="sm">
        <DialogTitle>Share Report to Users</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', gap:1, mb:1, justifyContent:'flex-end' }}>
            <Button size="small" onClick={()=> setShareUserIds((shareUsers||[]).map((u:any)=>u.id))}>Select All</Button>
            <Button size="small" onClick={()=> setShareUserIds([])}>Deselect All</Button>
          </Box>
          <TextField fullWidth size="small" label="Search counselors" value={shareUserSearch} onChange={(e)=>{
            const val = e.target.value; setShareUserSearch(val);
            if (shareSearchTimer) clearTimeout(shareSearchTimer);
            const t = setTimeout(async ()=>{
              try { const users = await reportsService.listShareUsers('counselor', val); setShareUsers((users as any)?.data || users || []); } catch {}
            }, 350);
            setShareSearchTimer(t);
          }} sx={{ mb: 2 }} />
          <List dense>
            {(shareUsers||[]).map((u:any) => {
              const checked = shareUserIds.includes(u.id);
              return (
                <ListItemButton key={u.id} onClick={()=> setShareUserIds(prev => checked ? prev.filter(x=>x!==u.id) : [...prev, u.id])}>
                  <ListItemIcon><Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple /></ListItemIcon>
                  <ListItemText primary={u.fullName || u.name || u.email} secondary={u.role ? String(u.role).replace('-', ' ') : ''} />
                </ListItemButton>
              );
            })}
            {shareUsers.length===0 && <Box sx={{ px:1, py:0.5, color:'text.secondary' }}>No users found</Box>}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setShareUserOpen(false); setShareUserIds([]); }}>Cancel</Button>
          <Button onClick={async()=>{
            if(menuRow){
              try {
                // Compute diffs
                const prev = new Set(initialShareUserIds);
                const next = new Set(shareUserIds);
                const toAdd: string[] = [];
                const toRemove: string[] = [];
                shareUsers.forEach((u:any)=>{
                  const id = u.id;
                  const was = prev.has(id);
                  const now = next.has(id);
                  if (!was && now) toAdd.push(id);
                  if (was && !now) toRemove.push(id);
                });

                // Direct shares only
                await Promise.all([
                  ...toAdd.map(uid => reportsService.share(menuRow.id, { target:'user', userId: uid })),
                  ...toRemove.map(uid => reportsService.share(menuRow.id, { target:'user', userId: uid, unshare: true })),
                ]);
                setRows(prevRows => prevRows.map(r => {
                  if (r.id !== menuRow.id) return r;
                  const st = new Set(r.sharedTo || []);
                  toAdd.forEach(uid => st.add(uid));
                  toRemove.forEach(uid => st.delete(uid));
                  return { ...r, sharedTo: Array.from(st) } as ReportRow;
                }));

                // Update menuRow snapshot
                const updated = (rows.find(r => r.id === menuRow.id) || menuRow) as ReportRow;
                setMenuRow(updated);
                setToast({open:true,message:'Sharing updated',severity:'success'});
              } catch(e:any){ setToast({open:true,message:e?.message||'Share update failed',severity:'error'});} }
            setShareUserOpen(false); setShareUserIds([]); setInitialShareUserIds([]); closeMenu();
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={()=>setMoveOpen(false)}>
        <DialogTitle>Move to Folder</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Folder"
              size="small"
              value={moveFolderId}
              onChange={(e)=>setMoveFolderId(String(e.target.value))}
            >
              <MenuItem value=""><em>(No Folder)</em></MenuItem>
              {(folders||[]).map(f => (<MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setMoveOpen(false)}>Cancel</Button>
          <Button onClick={async()=>{
            if (!menuRow) { setMoveOpen(false); return; }
            try { await reportsService.update(menuRow.id, { folderId: moveFolderId || null } as any); setRows(prev => prev.map(r => r.id===menuRow.id ? { ...r, folderId: moveFolderId || null } : r)); setToast({open:true,message:'Report moved',severity:'success'}); }
            catch(e:any){ setToast({open:true,message:e?.message||'Failed to move report',severity:'error'}); }
            finally { setMoveOpen(false); closeMenu(); }
          }}>Move</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameOpen} onClose={()=>setRenameOpen(false)}>
        <DialogTitle>Edit Report</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} sx={{mt:1, mb:2}}/>
          <TextField fullWidth multiline minRows={2} label="Description" value={menuRow?.description || ''} onChange={(e)=> setMenuRow(m => m ? ({ ...m, description: e.target.value }) : m)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setRenameOpen(false)}>Cancel</Button>
          <Button onClick={async()=>{ if(menuRow){ await reportsService.update(menuRow.id, { name: renameValue, description: menuRow.description || null } as any); fetchData(); } setRenameOpen(false); }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} onClose={()=>setToast(s=>({...s,open:false}))} autoHideDuration={3000} message={toast.message}/>
    </Box>
  );
};

export default ReportHome;
