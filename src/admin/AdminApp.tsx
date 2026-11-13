import { Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowLeft, ArrowRight, BadgePercent, BarChart3, Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Download, Eye, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Star, UploadCloud, Users, X } from 'lucide-react';
import { adminApi, adminUpload, jsonBody } from './api';
import './admin.css';

type Admin={id:number;name:string;email:string;role:string};
type Category={id:number;parentId:number|null;name:string;slug:string;sortOrder:number;active:boolean};
type Variant={id?:number;size:string;color:string;sku:string;stock:number;priceOverride?:number|null;available?:boolean};
type ImageItem={id?:number;url:string;publicId?:string|null;checksum?:string|null;type?:'main'|'gallery';thumbnail?:string};
const MAX_IMAGES=5;
const MAX_IMAGE_BYTES=5*1024*1024;
const ACCEPTED_IMAGE_TYPES=['image/jpeg','image/jpg','image/png','image/webp'];
const imageUrlOf=(image:ImageItem|string)=>typeof image==='string'?image:image?.url||'';

async function convertFileToWebP(file: File, quality = 0.92): Promise<File> {
  if (file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')) {
    return file;
  }
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
        resolve(webpFile);
      }, 'image/webp', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
const nav=[
  {label:'Overview',path:'/admin/dashboard',icon:LayoutDashboard},
  {label:'Products',path:'/admin/products',icon:Package},
  {label:'Categories',path:'/admin/categories',icon:Boxes},
  {label:'Inventory',path:'/admin/inventory',icon:ClipboardList},
  {label:'Orders',path:'/admin/orders',icon:ShoppingBag},
  {label:'Customers',path:'/admin/customers',icon:Users},
  {label:'Coupons & discounts',path:'/admin/coupons',icon:BadgePercent},
  {label:'Reviews',path:'/admin/reviews',icon:Star},
  {label:'Payments',path:'/admin/payments',icon:CircleDollarSign},
  {label:'Reports',path:'/admin/reports',icon:BarChart3},
  {label:'Website settings',path:'/admin/settings',icon:Settings},
  {label:'Admin profile',path:'/admin/profile',icon:ShieldCheck},
];
const schema=z.object({email:z.string().email('Enter a valid email.'),password:z.string().min(1,'Enter your password.')});
const money=(n:number|string)=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const date=(x:string)=>x?new Date(x).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
const statusClass=(s:string)=>`status-pill status-${String(s||'pending').toLowerCase().replace(/_/g,'-')}`;
function ErrorNotice({error}:{error:string}){return error?<div className="admin-alert" role="alert">{error}</div>:null;}
function Toast({message}:{message:string}){return message?<div className="admin-toast" role="status"><Check size={16}/>{message}</div>:null;}
function Loading(){return <div className="admin-loading"><span/><span/><span/></div>;}
function Empty({label='No records found.'}:{label?:string}){return <div className="admin-empty"><Package size={25}/><strong>{label}</strong></div>;}
function Table({columns,rows,empty}:{columns:string[];rows:React.ReactNode[][];empty?:string}){return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((cell,j)=><td key={j}>{cell}</td>)}</tr>):<tr><td colSpan={columns.length}><Empty label={empty}/></td></tr>}</tbody></table></div>;}
function SearchBox({value,onChange,placeholder='Search'}:{value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="admin-search"><Search size={16}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;}
function PageTitle({eyebrow,title,description,action}:{eyebrow:string;title:string;description?:string;action?:React.ReactNode}){return <div className="admin-page-title"><div><p>{eyebrow}</p><h1>{title}</h1>{description&&<span>{description}</span>}</div>{action}</div>;}
function Stat({label,value,change,icon:Icon,tone='blue'}:{label:string;value:string;change?:string;icon:any;tone?:string}){return <article className="admin-stat"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><span>{label}</span><strong>{value}</strong>{change&&<small>{change}</small>}</article>;}

export default function AdminApp(){const [admin,setAdmin]=useState<Admin|null>(null);const [loading,setLoading]=useState(true);const [authError,setAuthError]=useState('');const [busy,setBusy]=useState(false);const loc=useLocation();const navigate=useNavigate();const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});
  useEffect(()=>{adminApi<{admin:Admin|null}>('/auth/me').then(r=>setAdmin(r.admin)).catch(()=>setAdmin(null)).finally(()=>setLoading(false));},[]);
  const login=form.handleSubmit(async values=>{setBusy(true);setAuthError('');try{const r=await adminApi<{admin:Admin}>('/auth/login',{method:'POST',body:jsonBody(values)});setAdmin(r.admin);navigate('/admin/dashboard',{replace:true});}catch(e){setAuthError((e as Error).message);}finally{setBusy(false);}});
  if(loading)return <div className="admin-boot"><Loading/></div>;
  if(!admin)return <main className="admin-login"><section className="login-art"><div className="login-brand"><span className="brand-mark">S</span><b>SPIDY <i>CLOTHING</i></b></div><div className="login-art-copy"><span>THE CONTROL ROOM</span><h1>Good business.<br/><em>Better dressed.</em></h1><p>One clear view of the work behind every order.</p></div><div className="login-art-meta">SPIDY CLOTHING · ADMINISTRATION</div></section><section className="login-panel"><form className="login-form" onSubmit={login}><div className="login-mobile-brand">SPIDY <i>CLOTHING</i></div><span className="overline">ADMIN PORTAL</span><h2>Welcome back</h2><p>Sign in to manage your store.</p><ErrorNotice error={authError}/><label>Email address<input type="email" autoComplete="username" {...form.register('email')} placeholder="you@spidyclothing.com"/></label>{form.formState.errors.email&&<small className="field-error">{form.formState.errors.email.message}</small>}<label>Password<input type="password" autoComplete="current-password" {...form.register('password')} placeholder="Enter your password"/></label>{form.formState.errors.password&&<small className="field-error">{form.formState.errors.password.message}</small>}<div className="login-row"><label className="check-label"><input type="checkbox"/> Remember me</label><span>Password reset is handled by your store administrator.</span></div><button className="admin-primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}<ChevronRight size={16}/></button><div className="login-security"><ShieldCheck size={15}/> Secure administrator access</div></form></section></main>;
  if(loc.pathname==='/admin'||loc.pathname==='/admin/')return <Navigate to="/admin/dashboard" replace/>;
  const logout=async()=>{await adminApi('/auth/logout',{method:'POST'}).catch(()=>{});setAdmin(null);navigate('/admin',{replace:true});};
  return <AdminShell admin={admin} logout={logout}><Suspense fallback={<Loading/>}><Routes>
    <Route path="dashboard" element={<Dashboard/>}/>
    <Route path="products" element={<Products/>}/><Route path="products/add" element={<ProductEditor/>}/><Route path="products/edit/:id" element={<ProductEditor/>}/>
    <Route path="categories" element={<Categories/>}/><Route path="inventory" element={<Inventory/>}/>
    <Route path="orders" element={<Orders/>}/><Route path="orders/:id" element={<OrderDetails/>}/>
    <Route path="customers" element={<Customers/>}/><Route path="customers/:id" element={<CustomerDetails/>}/>
    <Route path="coupons" element={<Coupons/>}/><Route path="reviews" element={<Reviews/>}/><Route path="payments" element={<Payments/>}/>
    <Route path="reports" element={<Reports/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="profile" element={<Profile/>}/>
    <Route path="*" element={<Navigate to="/admin/dashboard" replace/>}/>
  </Routes></Suspense></AdminShell>;
}

function AdminShell({admin,logout,children}:{admin:Admin;logout:()=>void;children:React.ReactNode}){const loc=useLocation();const [open,setOpen]=useState(false);const current=nav.find(n=>loc.pathname===n.path||loc.pathname.startsWith(n.path+'/'))?.label||'Overview';return <div className="admin-shell"><button className={`admin-shade ${open?'show':''}`} onClick={()=>setOpen(false)} aria-label="Close navigation"/><aside className={`admin-sidebar ${open?'open':''}`}><Link to="/admin/dashboard" className="admin-brand"><span className="brand-mark">S</span><span>SPIDY <i>CLOTHING</i><small>ADMIN STUDIO</small></span></Link><div className="sidebar-section-label">STORE</div><nav>{nav.slice(0,10).map(({label,path,icon:Icon})=><Link key={path} to={path} onClick={()=>setOpen(false)} className={`admin-nav-link ${current===label?'active':''}`}><Icon size={17}/><span>{label}</span>{label==='Orders'&&<span className="nav-dot"/>}</Link>)}</nav><div className="sidebar-section-label">PREFERENCES</div><nav>{nav.slice(10).map(({label,path,icon:Icon})=><Link key={path} to={path} onClick={()=>setOpen(false)} className={`admin-nav-link ${current===label?'active':''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><div className="admin-user"><div className="user-avatar">{admin.name.slice(0,1).toUpperCase()}</div><span><b>{admin.name}</b><small>{admin.role}</small></span><button onClick={logout} title="Sign out"><LogOut size={16}/></button></div></div></aside><main className="admin-main"><header className="admin-topbar"><button className="mobile-menu" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu/></button><div className="breadcrumbs">Spidy Clothing <ChevronRight size={13}/><strong>{current}</strong></div><div className="topbar-actions"><span className="environment-tag"><i/> Live store</span><Link className="view-store" to="/" target="_blank">View storefront <Eye size={14}/></Link><div className="user-avatar mini">{admin.name.slice(0,1).toUpperCase()}</div></div></header><div className="admin-content">{children}</div><footer className="admin-footer"><span>SPIDY CLOTHING · ADMIN</span><span>Store operations, in one place.</span></footer></main></div>;}

function Dashboard(){const [data,setData]=useState<any>(null);const [error,setError]=useState('');useEffect(()=>{adminApi('/dashboard').then(setData).catch(e=>setError(e.message));},[]);if(!data&&!error)return <Loading/>;const totals=data?.totals||{};return <><PageTitle eyebrow="STORE OVERVIEW" title="Dashboard" description="A clear look at how your store is moving today." action={<button className="admin-secondary" onClick={()=>window.location.reload()}><Activity size={15}/> Refresh data</button>}/><ErrorNotice error={error}/><div className="admin-stat-grid"><Stat label="Total revenue" value={money(totals.revenue)} change="From active orders" icon={CircleDollarSign} tone="red"/><Stat label="Total orders" value={Number(totals.totalOrders||0).toLocaleString('en-IN')} change={`${totals.pendingOrders||0} need attention`} icon={ShoppingBag} tone="blue"/><Stat label="Active products" value={Number(totals.totalProducts||0).toLocaleString('en-IN')} icon={Package} tone="violet"/><Stat label="Customers" value={Number(totals.totalCustomers||0).toLocaleString('en-IN')} icon={Users} tone="green"/><Stat label="Pending orders" value={Number(totals.pendingOrders||0).toLocaleString('en-IN')} icon={ClipboardList} tone="amber"/><Stat label="Low stock items" value={Number(totals.lowStockProducts||0).toLocaleString('en-IN')} icon={Boxes} tone="orange"/></div><div className="admin-chart-grid"><section className="admin-panel sales-panel"><div className="panel-heading"><div><span>REVENUE</span><h2>Daily sales</h2></div><small>Last 14 days</small></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.daily||[]} margin={{left:0,right:8,top:10,bottom:0}}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9233a" stopOpacity={.22}/><stop offset="95%" stopColor="#e9233a" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="label" tickFormatter={x=>String(x).slice(5)} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8a94a8'}}/><YAxis tickFormatter={x=>`₹${Math.round(x/1000)}k`} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8a94a8'}}/><Tooltip formatter={(v:any)=>money(v)}/><Area type="monotone" dataKey="revenue" stroke="#e9233a" strokeWidth={2.5} fill="url(#salesFill)"/></AreaChart></ResponsiveContainer></div></section><section className="admin-panel order-chart-panel"><div className="panel-heading"><div><span>FULFILMENT</span><h2>Order statistics</h2></div><small>All time</small></div><div className="chart-area short"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.orderStats||[]} dataKey="count" nameKey="status" innerRadius={56} outerRadius={78} paddingAngle={4}>{(data?.orderStats||[]).map((_:any,i:number)=><Cell key={i} fill={['#0b1b40','#e9233a','#3768c8','#35a67a','#eb9c35','#9567c9','#a9b1bf'][i%7]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="chart-total"><strong>{totals.totalOrders||0}</strong><span>orders</span></div></div><div className="legend">{(data?.orderStats||[]).slice(0,4).map((x:any,i:number)=><span key={x.status}><i style={{background:['#0b1b40','#e9233a','#3768c8','#35a67a'][i]}}/>{x.status.replace(/_/g,' ')}</span>)}</div></section></div><div className="admin-lower-grid"><section className="admin-panel"><div className="panel-heading"><div><span>RECENT ACTIVITY</span><h2>Recent orders</h2></div><Link to="/admin/orders">View all <ChevronRight size={14}/></Link></div><Table columns={['Order','Customer','Date','Total','Status']} rows={(data?.recentOrders||[]).map((o:any)=>[<Link className="order-link" to={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link>,o.customer,date(o.createdAt),money(o.total),<span className={statusClass(o.status)}>{o.status}</span>])}/></section><div className="admin-side-stack"><section className="admin-panel"><div className="panel-heading"><div><span>INVENTORY</span><h2>Low stock alerts</h2></div><Link to="/admin/inventory">Manage <ChevronRight size={14}/></Link></div>{(data?.lowStock||[]).length?<div className="alert-list">{data.lowStock.slice(0,5).map((v:any,i:number)=><div key={i}><span className="alert-product"><b>{v.product}</b><small>{v.size} · {v.color}</small></span><strong className={v.stock===0?'out':'few'}>{v.stock===0?'Out':`${v.stock} left`}</strong></div>)}</div>:<Empty label="Stock levels look good."/>}</section><section className="admin-panel"><div className="panel-heading"><div><span>COMMUNITY</span><h2>New customers</h2></div><Link to="/admin/customers">View all <ChevronRight size={14}/></Link></div><div className="customer-mini-list">{(data?.latestCustomers||[]).slice(0,4).map((c:any)=><div key={c.email}><div className="user-avatar soft">{c.name.slice(0,1).toUpperCase()}</div><span><b>{c.name}</b><small>{c.email}</small></span><time>{date(c.createdAt)}</time></div>)}</div></section></div></div></>;}

function Products(){const [rows,setRows]=useState<any[]>([]);const [q,setQ]=useState('');const [error,setError]=useState('');const load=()=>adminApi<{products:any[]}>(`/products?q=${encodeURIComponent(q)}`).then(x=>setRows(x.products)).catch(e=>setError(e.message));useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t);},[q]);return <><PageTitle eyebrow="CATALOG" title="Products" description="Keep your catalogue sharp, accurate and ready to sell." action={<Link className="admin-primary" to="/admin/products/add"><Plus size={16}/> Add product</Link>}/><ErrorNotice error={error}/><section className="admin-panel"><div className="list-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search name or SKU"/><label className="filter-chip"><SlidersHorizontal size={15}/><select onChange={e=>{const v=e.target.value;adminApi<{products:any[]}>(`/products?status=${v}`).then(x=>setRows(x.products)).catch(z=>setError(z.message));}}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label></div><Table columns={['Product','SKU','Category','Price','Stock','Status','']} rows={rows.map(p=>[<div className="product-cell">{p.images?.[0]?<img src={p.images[0]} alt=""/>:<div className="product-placeholder"><Package size={18}/></div>}<span><b>{p.name}</b><small>{p.variants?.length||0} variants</small></span></div>,p.sku,p.category,money(p.price),p.variants?.reduce((n:number,v:Variant)=>n+Number(v.stock),0)||0,<span className={statusClass(p.product_status)}>{p.product_status}</span>,<Link className="icon-link" to={`/admin/products/edit/${p.id}`} aria-label={`Edit ${p.name}`}><ChevronRight size={17}/></Link>])}/></section></>;}

function ProductEditor(){
  const {id}=useParams();
  const navigate=useNavigate();
  const [categories,setCategories]=useState<Category[]>([]);
  const [form,setForm]=useState<any>({name:'',slug:'',sku:'',categoryId:'',subcategoryId:'',price:'',oldPrice:'',fit:'Regular',description:'',fabricCare:'',status:'active',featured:false,trending:false,bestSeller:false,newArrival:false,colors:[],images:[],variants:[] as Variant[]});
  const [size,setSize]=useState('M');
  const [selectedColors,setSelectedColors]=useState<string[]>(['Black']);
  const [palette,setPalette]=useState<string[]>(['Black','White','Blue','Grey','Beige','Navy','Olive','Maroon','Brown','Green','Red','Yellow']);
  const [customColor,setCustomColor]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [toast,setToast]=useState('');
  const [subOpen,setSubOpen]=useState(false);
  const [newSub,setNewSub]=useState('');
  const [subBusy,setSubBusy]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [cloudStatus,setCloudStatus]=useState<{connected?:boolean;cloudName?:string}|null>(null);

  const loadCategories=()=>adminApi<{categories:Category[]}>('/categories')
    .then(r=>setCategories(r.categories.filter(c=>c.active)))
    .catch(e=>setError(e.message));

  useEffect(()=>{
    loadCategories();
    adminApi<{connected?:boolean;cloudName?:string}>('/cloudinary/status')
      .then(setCloudStatus)
      .catch(()=>setCloudStatus({connected:false}));
    if(id)adminApi<{product:any}>(`/products/${id}`).then(r=>{
      const product=r.product;
      setForm({...product,categoryId:String(product.categoryId||''),subcategoryId:String(product.subcategoryId||''),status:product.product_status,colors:product.colors||[],images:(product.images||[]).map((image:any)=>typeof image==='string'?{url:image}:image),variants:product.variants||[]});
      setSelectedColors(product.colors?.length?product.colors:['Black']);
      setPalette(current=>Array.from(new Set([...current,...(product.colors||[])])));
    }).catch(e=>setError(e.message));
  },[id]);

  const sortCats=(list:Category[])=>[...list].sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));
  const main=sortCats(categories.filter(c=>!c.parentId));
  const subs=sortCats(categories.filter(c=>String(c.parentId)===String(form.categoryId)));
  const selectedMain=main.find(c=>String(c.id)===String(form.categoryId));
  const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));

  const createSubcategory=async()=>{
    const name=newSub.trim();
    if(name.length<2||!form.categoryId)return;
    setSubBusy(true);setError('');
    try{
      const r=await adminApi<{id:number}>('/categories',{method:'POST',body:jsonBody({name,parentId:Number(form.categoryId)})});
      await loadCategories();
      set('subcategoryId',String(r.id));
      setNewSub('');setSubOpen(false);setToast('Subcategory added');
    }catch(e){setError((e as Error).message);}
    finally{setSubBusy(false);}
  };

  const syncColors=(next:string[])=>setForm((f:any)=>({...f,colors:Array.from(new Set([...next,...(f.variants||[]).map((v:Variant)=>v.color)]))}));
  const toggleColor=(value:string)=>{
    const next=selectedColors.includes(value)?selectedColors.filter(c=>c!==value):[...selectedColors,value];
    setSelectedColors(next);syncColors(next);
  };
  const addCustomColor=()=>{
    const value=customColor.trim();
    if(value.length<2)return;
    setPalette(current=>current.includes(value)?current:[...current,value]);
    if(!selectedColors.includes(value)){const next=[...selectedColors,value];setSelectedColors(next);syncColors(next);}
    setCustomColor('');
  };

  const addVariants=()=>{
    if(!selectedColors.length){setError('Choose at least one colour.');return;}
    const next=[...form.variants];
    for(const color of selectedColors){
      if(next.some(v=>v.color===color&&v.size===size))continue;
      const vsku=`${form.sku||'SP-NEW'}-${size}-${color.toUpperCase().replace(/[^A-Z0-9]/g,'')}`;
      next.push({size,color,sku:vsku,stock:0,available:true});
    }
    if(next.length===form.variants.length){setToast('Those variants already exist.');return;}
    setForm((f:any)=>({...f,variants:next,colors:Array.from(new Set([...(f.colors||[]),...selectedColors,...next.map((v:Variant)=>v.color)]))}));
    setToast(`${next.length-form.variants.length} variant(s) added.`);
  };

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      if((form.images||[]).length===0){throw new Error('Add at least one product image before saving.');}
      if((form.images||[]).length>MAX_IMAGES){throw new Error(`A product can have a maximum of ${MAX_IMAGES} images.`);}
      const payload={...form,images:(form.images||[]).map((image:ImageItem)=>({url:imageUrlOf(image),publicId:image.publicId||null,checksum:image.checksum||null})),colors:Array.from(new Set([...(form.colors||[]),...selectedColors,...(form.variants||[]).map((v:Variant)=>v.color)]))};
      await adminApi(`/products${id?`/${id}`:''}`,{method:id?'PUT':'POST',body:jsonBody(payload)});
      setToast('Product saved');setTimeout(()=>navigate('/admin/products'),500);
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };

  const categoryPayload=(target:FormData)=>{
    target.append('category',selectedMain?.name||'');
    if(form.categoryId)target.append('categoryId',String(form.categoryId));
    if(id)target.append('productId',String(id));
  };

  const addImages=async(files:FileList|File[]|null)=>{
    if(uploading)return;
    const picked=Array.from(files||[]);
    if(!picked.length)return;
    const slots=MAX_IMAGES-(form.images||[]).length;
    if(slots<=0){setError(`This product already has ${MAX_IMAGES} images. Remove one before adding another.`);return;}
    const accepted:File[]=[];
    for(const file of picked){
      if(accepted.length>=slots)break;
      if(!ACCEPTED_IMAGE_TYPES.includes(file.type)){setError(`${file.name}: only JPG, JPEG, PNG and WebP images are supported.`);continue;}
      if(file.size>MAX_IMAGE_BYTES){setError(`${file.name} is larger than 5 MB.`);continue;}
      accepted.push(file);
    }
    if(!accepted.length)return;
    setUploading(true);setProgress(0);setError('');
    try{
      const webpFiles=await Promise.all(accepted.map(f=>convertFileToWebP(f)));
      const fd=new FormData();
      webpFiles.forEach(file=>fd.append('images',file));
      categoryPayload(fd);
      const result=await adminUpload<{images:ImageItem[]}>('/products/images',fd,setProgress);
      const existing=new Set((form.images||[]).map((image:ImageItem)=>imageUrlOf(image)));
      const incoming=(result.images||[]).filter(image=>image?.url&&!existing.has(image.url));
      if(!incoming.length)throw new Error('That image is already in this product gallery.');
      setForm((f:any)=>({...f,images:[...(f.images||[]),...incoming].slice(0,MAX_IMAGES)}));
      setToast(`${incoming.length} image${incoming.length===1?'':'s'} converted to WebP & uploaded to Cloudinary.`);
    }catch(e){setError((e as Error).message);}
    finally{setUploading(false);setProgress(0);}
  };

  const replaceImage=async(index:number,file?:File)=>{
    if(!file||uploading)return;
    if(!ACCEPTED_IMAGE_TYPES.includes(file.type)){setError('Only JPG, JPEG, PNG and WebP images are supported.');return;}
    if(file.size>MAX_IMAGE_BYTES){setError(`${file.name} is larger than 5 MB.`);return;}
    setUploading(true);setProgress(0);setError('');
    try{
      const webpFile=await convertFileToWebP(file);
      const current=form.images?.[index] as ImageItem|undefined;
      const fd=new FormData();
      fd.append('images',webpFile);
      if(current?.publicId)fd.append('oldPublicId',current.publicId);
      categoryPayload(fd);
      const result=await adminUpload<{image:ImageItem}>('/products/images/replace',fd,setProgress);
      setForm((f:any)=>({...f,images:(f.images||[]).map((image:ImageItem,position:number)=>position===index?result.image:image)}));
      setToast('Image converted to WebP & replaced in Cloudinary.');
    }catch(e){setError((e as Error).message);}
    finally{setUploading(false);setProgress(0);}
  };

  const removeImage=async(index:number)=>{
    const image=form.images?.[index] as ImageItem|undefined;
    if(!image)return;
    if(!image.publicId&&!id){setForm((f:any)=>({...f,images:(f.images||[]).filter((_:ImageItem,position:number)=>position!==index)}));return;}
    setError('');
    try{
      await adminApi('/products/images/delete',{method:'POST',body:jsonBody({publicId:image.publicId||'',url:image.url})});
      setForm((f:any)=>({...f,images:(f.images||[]).filter((_:ImageItem,position:number)=>position!==index)}));
      setToast('Image deleted from the product and Cloudinary.');
    }catch(e){setError((e as Error).message);}
  };

  const makeMain=(index:number)=>setForm((f:any)=>{
    const images=[...(f.images||[])];
    const [picked]=images.splice(index,1);
    return picked?{...f,images:[picked,...images]}:f;
  });

  const moveImage=(index:number,direction:-1|1)=>setForm((f:any)=>{
    const images=[...(f.images||[])];
    const target=index+direction;
    if(target<0||target>=images.length)return f;
    [images[index],images[target]]=[images[target],images[index]];
    return {...f,images};
  });

  const onDrop=(event:React.DragEvent<HTMLElement>)=>{event.preventDefault();setDragging(false);void addImages(event.dataTransfer.files);};

  return <><PageTitle eyebrow="CATALOG / PRODUCT" title={id?'Edit product':'Add product'} description="Product details, images and variant-level stock." action={<button className="admin-secondary" onClick={()=>navigate('/admin/products')}><ChevronLeft size={16}/> Back to products</button>}/><ErrorNotice error={error}/><Toast message={toast}/><form className="product-form" onSubmit={save}>
    <section className="admin-panel form-section">
      <div className="form-section-head"><span>01</span><div><h2>Product details</h2><p>Basic information shown to customers.</p></div></div>
      <div className="form-grid">
        <label className="span-2">Product name<input required value={form.name} onChange={e=>set('name',e.target.value)}/></label>
        <label>Product slug<input required value={form.slug} onChange={e=>set('slug',e.target.value)} placeholder="generated-from-name"/></label>
        <label>Product SKU<input required value={form.sku} onChange={e=>set('sku',e.target.value)}/></label>
        <label>Category<select required value={form.categoryId} onChange={e=>{set('categoryId',e.target.value);set('subcategoryId','');}}><option value="">Select category</option>{main.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Subcategory<select value={form.subcategoryId} onChange={e=>set('subcategoryId',e.target.value)} disabled={!form.categoryId}><option value="">{form.categoryId?'Select subcategory':'Choose a category first'}</option>{subs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Regular price (₹)<input type="number" min="0" required value={form.oldPrice} onChange={e=>set('oldPrice',e.target.value)}/></label>
        <label>Sale price (₹)<input type="number" min="0" required value={form.price} onChange={e=>set('price',e.target.value)}/></label>
        <label>Fit<select value={form.fit} onChange={e=>set('fit',e.target.value)}>{['Slim','Regular','Relaxed','Oversized','Baggy'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={e=>set('status',e.target.value)}>{['active','draft','archived'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="span-2">Description<textarea rows={4} value={form.description} onChange={e=>set('description',e.target.value)}/></label>
        <label className="span-2">Fabric & care<textarea rows={3} value={form.fabricCare} onChange={e=>set('fabricCare',e.target.value)}/></label>
      </div>
      {form.categoryId&&<div className="inline-subcategory">
        {subOpen?<><input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder={`New subcategory under ${selectedMain?.name||'this category'}`} maxLength={100}/><button type="button" className="admin-primary compact" onClick={createSubcategory} disabled={subBusy||newSub.trim().length<2}>{subBusy?'Adding…':'Add subcategory'}</button><button type="button" className="admin-secondary compact" onClick={()=>{setSubOpen(false);setNewSub('');}}>Cancel</button></>:<button type="button" className="admin-secondary compact" onClick={()=>setSubOpen(true)}><Plus size={14}/> Add a subcategory</button>}
      </div>}
      <div className="flag-row">{[['featured','Featured'],['trending','Trending'],['bestSeller','Best seller'],['newArrival','New arrival']].map(([key,label])=><label key={key} className="check-label"><input type="checkbox" checked={!!form[key]} onChange={e=>set(key,e.target.checked)}/>{label}</label>)}</div>
    </section>

    <section className="admin-panel form-section">
      <div className="form-section-head">
        <span>02</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2>Product images</h2>
            {cloudStatus?.connected && (
              <span className="status-chip active" style={{ fontSize: '11px', padding: '3px 8px', letterSpacing: '0.04em' }}>
                ● Cloudinary Connected ({cloudStatus.cloudName}) · WebP Auto-Format Active
              </span>
            )}
          </div>
          <p>Add 3–5 images per product. JPG, PNG or WebP files are automatically converted and optimized to WebP format. 5 MB max per image.</p>
        </div>
      </div>
      <label className={`image-dropzone ${dragging?'dragging':''} ${uploading?'uploading':''}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
        <UploadCloud size={26}/>
        <strong>{uploading?'Converting to WebP & uploading to Cloudinary…':'Drag & drop images here'}</strong>
        <span>or click to browse — auto-converts to WebP, up to {MAX_IMAGES} images, 5 MB each</span>
        <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" disabled={uploading} onChange={e=>{void addImages(e.target.files);e.target.value='';}}/>
      </label>
      {uploading&&<div className="upload-progress" role="status" aria-live="polite"><div><span style={{width:`${Math.max(6,progress)}%`}}/></div><small>{progress<100?`Processing & Uploading… ${progress}%`:'Optimizing on Cloudinary (WebP)…'}</small></div>}
      {form.images.length===0
        ?<p className="image-empty">No images yet. Upload the first image and it will automatically become the main product image.</p>
        :<div className="image-editor-grid">{form.images.map((image:ImageItem,index:number)=><figure className="image-editor-card" key={`${image.publicId||image.url}-${index}`}>
          <div className="image-editor-frame">
            <img src={image.thumbnail||image.url} alt={`Product image ${index+1}`} loading="lazy" decoding="async"/>
            {index===0&&<span className="main-image-badge">MAIN</span>}
            <span className="image-position">{index+1}</span>
          </div>
          <figcaption>
            <button type="button" className="image-tool" onClick={()=>makeMain(index)} disabled={index===0} title="Set as main image" aria-label="Set as main image"><Star size={13}/></button>
            <button type="button" className="image-tool" onClick={()=>moveImage(index,-1)} disabled={index===0} title="Move left" aria-label="Move image left"><ArrowLeft size={13}/></button>
            <button type="button" className="image-tool" onClick={()=>moveImage(index,1)} disabled={index===form.images.length-1} title="Move right" aria-label="Move image right"><ArrowRight size={13}/></button>
            <label className="image-tool replace-upload" title="Replace image"><UploadCloud size={13}/><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void replaceImage(index,file);}}/></label>
            <button type="button" className="image-tool danger" onClick={()=>void removeImage(index)} title="Delete image" aria-label="Delete image"><X size={13}/></button>
          </figcaption>
        </figure>)}</div>}
      <p className="image-hint">Cloudinary folder: <code>SPIDY_CLOTHING/PRODUCTS/{selectedMain?.name?selectedMain.name.toUpperCase().replace(/[^A-Z0-9]+/g,'_'):'…'}</code> · All product assets are formatted as <strong>WebP</strong>.</p>
    </section>

    <section className="admin-panel form-section">
      <div className="form-section-head"><span>03</span><div><h2>Size & colour variants</h2><p>Select one size and one or more colours, then add every combination at once.</p></div></div>
      <div className="variant-add-row">
        <label>Size<select value={size} onChange={e=>setSize(e.target.value)}>{['S','M','L','XL','XXL','28','30','32','34','36','38'].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="color-picker"><span className="field-label">Colours — select multiple</span><div className="color-chips">{palette.map(c=><button type="button" key={c} className={selectedColors.includes(c)?'selected':''} onClick={()=>toggleColor(c)} aria-pressed={selectedColors.includes(c)}>{c}</button>)}</div></div>
        <button type="button" className="admin-secondary" onClick={addVariants} disabled={!selectedColors.length}><Plus size={15}/> Add variants</button>
      </div>
      <div className="custom-color-row"><input value={customColor} onChange={e=>setCustomColor(e.target.value)} placeholder="Add another colour (e.g. Charcoal)" maxLength={40}/><button type="button" className="admin-secondary compact" onClick={addCustomColor} disabled={customColor.trim().length<2}><Plus size={14}/> Add colour</button></div>
      <Table columns={['Size','Colour','Variant SKU','Stock','Price override','']} rows={form.variants.map((v:Variant,i:number)=>[v.size,v.color,<input className="inline-input" value={v.sku} onChange={e=>set('variants',form.variants.map((x:Variant,j:number)=>j===i?{...x,sku:e.target.value}:x))}/>,<input className="inline-input small" type="number" min="0" value={v.stock} onChange={e=>set('variants',form.variants.map((x:Variant,j:number)=>j===i?{...x,stock:Number(e.target.value)}:x))}/>,<input className="inline-input small" type="number" min="0" value={v.priceOverride||''} placeholder="Default" onChange={e=>set('variants',form.variants.map((x:Variant,j:number)=>j===i?{...x,priceOverride:e.target.value?Number(e.target.value):null}:x))}/>,<button type="button" className="icon-link danger" onClick={()=>set('variants',form.variants.filter((_:Variant,j:number)=>j!==i))}><X size={15}/></button>])} empty="Add at least one variant."/>
    </section>

    <div className="form-actions"><button type="button" className="admin-secondary" onClick={()=>navigate('/admin/products')}>Cancel</button><button className="admin-primary" disabled={busy}>{busy?'Saving…':id?'Save changes':'Create product'}</button></div>
  </form></>;
}

function Categories(){const [cats,setCats]=useState<Category[]>([]);const [name,setName]=useState('');const [parent,setParent]=useState('');const [error,setError]=useState('');const load=()=>adminApi<{categories:Category[]}>('/categories').then(r=>setCats(r.categories)).catch(e=>setError(e.message));useEffect(()=>{load();},[]);const save=async()=>{try{await adminApi('/categories',{method:'POST',body:jsonBody({name,parentId:parent||null})});setName('');setParent('');load();}catch(e){setError((e as Error).message);}};const toggle=async(c:Category)=>{await adminApi(`/categories/${c.id}`,{method:'PUT',body:jsonBody({...c,active:!c.active,parentId:c.parentId})});load();};return <><PageTitle eyebrow="CATALOG" title="Categories" description="Organize the store and keep collections easy to browse."/><ErrorNotice error={error}/><section className="admin-panel form-section"><h2>Add category or subcategory</h2><div className="inline-create"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Category name"/><select value={parent} onChange={e=>setParent(e.target.value)}><option value="">Main category</option>{cats.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.id}>Under {c.name}</option>)}</select><button className="admin-primary" onClick={save} disabled={name.trim().length<2}><Plus size={15}/> Add</button></div></section><section className="admin-panel"><Table columns={['Category','Type','Order','Status','Actions']} rows={cats.map(c=>[<b>{c.name}</b>,c.parentId?'Subcategory':'Main category',<input className="inline-input tiny" type="number" value={c.sortOrder} onChange={async e=>{await adminApi(`/categories/${c.id}`,{method:'PUT',body:jsonBody({...c,sortOrder:Number(e.target.value),parentId:c.parentId})});}}/>,<span className={statusClass(c.active?'active':'archived')}>{c.active?'Active':'Inactive'}</span>,<button className="admin-secondary compact" onClick={()=>toggle(c)}>{c.active?'Deactivate':'Activate'}</button>])}/></section></>;}

function Inventory(){const [data,setData]=useState<any>({variants:[],movements:[]});const [error,setError]=useState('');const [variantId,setVariant]=useState('');const [delta,setDelta]=useState('');const [note,setNote]=useState('');const load=()=>adminApi('/inventory').then(setData).catch(e=>setError(e.message));useEffect(()=>{load();},[]);const adjust=async()=>{try{await adminApi('/inventory/adjust',{method:'POST',body:jsonBody({variantId:Number(variantId),delta:Number(delta),note})});setDelta('');setNote('');load();}catch(e){setError((e as Error).message);}};return <><PageTitle eyebrow="OPERATIONS" title="Inventory" description="Track every size and colour combination across the store."/><ErrorNotice error={error}/><section className="admin-panel form-section"><h2>Manual stock adjustment</h2><div className="inline-create"><select value={variantId} onChange={e=>setVariant(e.target.value)}><option value="">Choose product variant</option>{data.variants.map((v:any)=><option key={v.variantId} value={v.variantId}>{v.product} · {v.size} · {v.color} ({v.stock} available)</option>)}</select><input type="number" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="Increase or decrease (e.g. 5, -2)"/><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Reason / note"/><button className="admin-primary" onClick={adjust} disabled={!variantId||!Number(delta)}><Check size={15}/> Apply</button></div></section><section className="admin-panel"><div className="panel-heading"><div><span>LIVE STOCK</span><h2>Product variants</h2></div><span className="quiet">{data.variants.length} variants</span></div><Table columns={['Product','Variant','SKU','Available stock','Status']} rows={data.variants.map((v:any)=>[v.product,`${v.size} · ${v.color}`,v.sku,<b className={v.stock<=5?'few':''}>{v.stock}</b>,<span className={statusClass(v.stock?'active':'archived')}>{v.stock?'In stock':'Out of stock'}</span>])}/></section><section className="admin-panel"><div className="panel-heading"><div><span>AUDIT TRAIL</span><h2>Recent stock movements</h2></div></div><Table columns={['Date','Product','Variant','Change','Reason','Updated by']} rows={data.movements.map((m:any)=>[date(m.createdAt),m.product,`${m.size} · ${m.color}`,<b className={m.delta>0?'positive':'negative'}>{m.delta>0?'+':''}{m.delta}</b>,m.note||m.reason,m.admin||'System'])}/></section></>;}

function Orders(){const [orders,setOrders]=useState<any[]>([]);const [q,setQ]=useState('');const [status,setStatus]=useState('');const [error,setError]=useState('');useEffect(()=>{const t=setTimeout(()=>adminApi<{orders:any[]}>(`/orders?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`).then(r=>setOrders(r.orders)).catch(e=>setError(e.message)),180);return()=>clearTimeout(t);},[q,status]);return <><PageTitle eyebrow="OPERATIONS" title="Orders" description="Review orders and keep each delivery moving."/><ErrorNotice error={error}/><section className="admin-panel"><div className="list-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search order or customer"/><select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned'].map(x=><option key={x} value={x}>{x.replace(/_/g,' ')}</option>)}</select></div><Table columns={['Order','Customer','Placed','Items','Total','Payment','Status','']} rows={orders.map(o=>[<Link className="order-link" to={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link>,<span>{o.customer}<small className="cell-sub">{o.email}</small></span>,date(o.createdAt),o.itemCount,money(o.total),<span className={statusClass(o.paymentStatus)}>{o.method?.toUpperCase()} · {o.paymentStatus?.replace(/_/g,' ')}</span>,<span className={statusClass(o.status)}>{o.status?.replace(/_/g,' ')}</span>,<Link className="icon-link" to={`/admin/orders/${o.orderNumber}`}><ChevronRight size={17}/></Link>])}/></section></>;}

function OrderDetails(){const {id}=useParams();const [data,setData]=useState<any>(null);const [status,setStatus]=useState('');const [tracking,setTracking]=useState('');const [error,setError]=useState('');const [toast,setToast]=useState('');const load=()=>adminApi<{order:any}>(`/orders/${id}`).then(r=>{setData(r.order);setStatus(r.order.order_status);setTracking(r.order.tracking_number||'');}).catch(e=>setError(e.message));useEffect(()=>{load();},[id]);const save=async()=>{try{await adminApi(`/orders/${id}/status`,{method:'PATCH',body:jsonBody({status,trackingNumber:tracking})});setToast('Order updated');load();}catch(e){setError((e as Error).message);}};if(!data&&!error)return <Loading/>;return <><PageTitle eyebrow="ORDERS" title={data?.order_number||'Order details'} description={`Placed ${date(data?.created_at)} · ${data?.customer_email||''}`} action={<Link className="admin-secondary" to="/admin/orders"><ChevronLeft size={15}/> All orders</Link>}/><ErrorNotice error={error}/><Toast message={toast}/><div className="detail-grid"><section className="admin-panel detail-card"><div className="panel-heading"><div><span>FULFILMENT</span><h2>Order progress</h2></div><span className={statusClass(data?.order_status)}>{data?.order_status?.replace(/_/g,' ')}</span></div><div className="form-grid"><label>Update status<select value={status} onChange={e=>setStatus(e.target.value)}>{['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned'].map(x=><option key={x} value={x}>{x.replace(/_/g,' ')}</option>)}</select></label><label>Tracking number<input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="Add shipment reference"/></label></div><button className="admin-primary" onClick={save}><Check size={15}/> Save update</button></section><section className="admin-panel detail-card"><div className="panel-heading"><div><span>CUSTOMER</span><h2>Delivery details</h2></div></div><p className="address-block"><b>{data?.customer_name}</b><br/>{data?.customer_email}<br/>{data?.customer_phone}<br/><br/>{data?.address}<br/>{data?.city}, {data?.state} {data?.pincode}</p></section></div><section className="admin-panel"><div className="panel-heading"><div><span>ORDER CONTENTS</span><h2>Items & payment</h2></div><span className={statusClass(data?.payment_status)}>{data?.payment_method?.toUpperCase()} · {data?.payment_status?.replace(/_/g,' ')}</span></div><Table columns={['Product','Size','Colour','Unit price','Quantity','Line total']} rows={(data?.items||[]).map((i:any)=>[i.product_name,i.size_name,i.color,money(i.unit_price),i.quantity,money(i.line_total)])}/><div className="order-totals"><span>Subtotal <b>{money(data?.subtotal)}</b></span><span>Discount <b>−{money(data?.discount)}</b></span><span>Shipping <b>{money(data?.shipping)}</b></span><strong>Total <b>{money(data?.total)}</b></strong></div></section></>;}

function Customers(){const [rows,setRows]=useState<any[]>([]);const [q,setQ]=useState('');const [error,setError]=useState('');useEffect(()=>{const t=setTimeout(()=>adminApi<{customers:any[]}>(`/customers?q=${encodeURIComponent(q)}`).then(r=>setRows(r.customers)).catch(e=>setError(e.message)),180);return()=>clearTimeout(t);},[q]);return <><PageTitle eyebrow="PEOPLE" title="Customers" description="Store accounts, order history and customer value."/><ErrorNotice error={error}/><section className="admin-panel"><div className="list-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search customers"/><span className="quiet">{rows.length} customers shown</span></div><Table columns={['Customer','Phone','Joined','Orders','Lifetime spend','Status','']} rows={rows.map(c=>[<Link className="customer-link" to={`/admin/customers/${c.id}`}><div className="user-avatar soft">{c.name.slice(0,1).toUpperCase()}</div><span><b>{c.name}</b><small>{c.email}</small></span></Link>,c.phone||'—',date(c.createdAt),c.totalOrders,money(c.totalSpent),<span className={statusClass(c.active?'active':'archived')}>{c.active?'Active':'Disabled'}</span>,<Link to={`/admin/customers/${c.id}`} className="icon-link"><ChevronRight size={17}/></Link>])}/></section></>;}
function CustomerDetails(){const {id}=useParams();const [d,setD]=useState<any>(null);const [error,setError]=useState('');const load=()=>adminApi(`/customers/${id}`).then(setD).catch(e=>setError(e.message));useEffect(()=>{load();},[id]);const toggle=async()=>{await adminApi(`/customers/${id}/status`,{method:'PATCH',body:jsonBody({active:!d.customer.active})});load();};if(!d&&!error)return <Loading/>;return <><PageTitle eyebrow="CUSTOMERS" title={d?.customer.name||'Customer'} description={d?.customer.email} action={<button className="admin-secondary" onClick={toggle}>{d?.customer.active?'Disable account':'Enable account'}</button>}/><ErrorNotice error={error}/><section className="admin-panel"><div className="panel-heading"><div><span>ORDER HISTORY</span><h2>Past orders</h2></div></div><Table columns={['Order','Date','Total','Status']} rows={(d?.orders||[]).map((o:any)=>[<Link className="order-link" to={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link>,date(o.createdAt),money(o.total),<span className={statusClass(o.status)}>{o.status}</span>])}/></section></>;}

function Coupons(){const [rows,setRows]=useState<any[]>([]);const [form,setForm]=useState<any>({code:'',discountType:'percentage',discountValue:'10',minimumOrderAmount:'0',usageLimit:'',expiresAt:''});const [error,setError]=useState('');const load=()=>adminApi<{coupons:any[]}>('/coupons').then(r=>setRows(r.coupons)).catch(e=>setError(e.message));useEffect(()=>{load();},[]);const save=async()=>{try{await adminApi('/coupons',{method:'POST',body:jsonBody(form)});setForm({...form,code:''});load();}catch(e){setError((e as Error).message);}};const disable=async(id:number)=>{await adminApi(`/coupons/${id}`,{method:'DELETE'});load();};return <><PageTitle eyebrow="MARKETING" title="Coupons & discounts" description="Set clear promotion rules and keep an eye on usage."/><ErrorNotice error={error}/><section className="admin-panel form-section"><h2>Create coupon</h2><div className="form-grid compact-grid"><label>Code<input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/></label><label>Discount type<select value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value})}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Discount value<input type="number" min="1" value={form.discountValue} onChange={e=>setForm({...form,discountValue:e.target.value})}/></label><label>Minimum order (₹)<input type="number" min="0" value={form.minimumOrderAmount} onChange={e=>setForm({...form,minimumOrderAmount:e.target.value})}/></label><label>Usage limit<input type="number" min="1" value={form.usageLimit} onChange={e=>setForm({...form,usageLimit:e.target.value})} placeholder="Unlimited"/></label><label>Expiry date<input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></label></div><button className="admin-primary" onClick={save} disabled={!form.code}><Plus size={15}/> Create coupon</button></section><section className="admin-panel"><Table columns={['Code','Discount','Minimum order','Usage','Expiry','Status','']} rows={rows.map(c=>[<b className="coupon-code">{c.code}</b>,`${c.discount_value}${c.discount_type==='percentage'?'%':' ₹'}`,money(c.minimum_order_amount),`${c.usage_count}${c.usage_limit?` / ${c.usage_limit}`:''}`,date(c.expires_at),<span className={statusClass(c.is_active?'active':'archived')}>{c.is_active?'Active':'Inactive'}</span>,<button className="icon-link danger" onClick={()=>disable(c.id)}><X size={15}/></button>])}/></section></>;}

function Reviews(){const [rows,setRows]=useState<any[]>([]);const [filter,setFilter]=useState('');const [error,setError]=useState('');const load=()=>adminApi<{reviews:any[]}>('/reviews').then(r=>setRows(filter?r.reviews.filter(x=>x.status===filter):r.reviews)).catch(e=>setError(e.message));useEffect(()=>{load();},[filter]);const update=async(id:number,status:string)=>{await adminApi(`/reviews/${id}`,{method:'PATCH',body:jsonBody({status})});load();};return <><PageTitle eyebrow="COMMUNITY" title="Reviews" description="Keep customer feedback visible and well moderated."/><ErrorNotice error={error}/><section className="admin-panel"><div className="list-toolbar"><span className="quiet">{rows.length} reviews</span><select className="filter-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All reviews</option>{['pending','published','rejected'].map(x=><option key={x}>{x}</option>)}</select></div><Table columns={['Product','Customer','Rating','Review','Date','Status','Actions']} rows={rows.map(r=>[r.product,`${r.customer_name}${r.customerEmail?` · ${r.customerEmail}`:''}`,<span className="rating">{'★'.repeat(Number(r.rating))}</span>,<span className="review-copy">{r.review_text}</span>,date(r.created_at),<span className={statusClass(r.status)}>{r.status}</span>,<div className="action-pair"><button className="text-action" onClick={()=>update(r.id,'published')}>Publish</button><button className="text-action danger" onClick={()=>update(r.id,'rejected')}>Reject</button></div>])}/></section></>;}

function Payments(){const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState('');const load=()=>adminApi<{payments:any[]}>('/payments').then(r=>setRows(r.payments)).catch(e=>setError(e.message));useEffect(()=>{load();},[]);const markPaid=async(p:any)=>{try{await adminApi(`/payments/${p.id}`,{method:'PATCH',body:jsonBody({status:'paid',reference:p.transaction_reference})});load();}catch(e){setError((e as Error).message);}};return <><PageTitle eyebrow="FINANCE" title="Payments" description="Payment records and settlement status. No payment is marked processed without verification."/><ErrorNotice error={error}/><div className="notice-strip"><ShieldCheck size={17}/><span>Cash on Delivery is the active checkout method. UPI and card payments stay pending until a verified payment provider is connected.</span></div><section className="admin-panel"><Table columns={['Order','Customer','Method','Reference','Amount','Status','Updated']} rows={rows.map(p=>[<Link className="order-link" to={`/admin/orders/${p.orderNumber}`}>{p.orderNumber}</Link>,p.customer,p.method.toUpperCase(),p.transaction_reference||'—',money(p.total),<span className={statusClass(p.status)}>{p.status}</span>,p.method==='cod'&&p.status==='pending'?<button className="text-action" onClick={()=>markPaid(p)}>Record COD received</button>:<span className="quiet">{p.provider_verified?'Verified':'Unverified'}</span>])}/></section></>;}

function Reports(){const [kind,setKind]=useState('sales');const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState('');useEffect(()=>{adminApi<{rows:any[]}>(`/reports?kind=${kind}`).then(r=>setRows(r.rows)).catch(e=>setError(e.message));},[kind]);const exportCsv=async()=>{try{const blob=await adminApi<Blob>(`/reports?kind=${kind}&format=csv`);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`spidy-${kind}.csv`;a.click();URL.revokeObjectURL(url);}catch(e){setError((e as Error).message);}};const cols=rows.length?Object.keys(rows[0]):[];return <><PageTitle eyebrow="INSIGHTS" title="Reports & analytics" description="Use real order, customer and inventory data to make the next call." action={<button className="admin-secondary" onClick={exportCsv}><Download size={15}/> Export CSV</button>}/><ErrorNotice error={error}/><section className="admin-panel"><div className="list-toolbar"><select className="filter-select" value={kind} onChange={e=>setKind(e.target.value)}>{[['sales','Sales by day'],['products','Best-selling products'],['categories','Category performance'],['customers','Customer growth & spending'],['inventory','Inventory valuation']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><span className="quiet">Live database report</span></div><Table columns={cols.map(x=>x.replace(/_/g,' '))} rows={rows.map(r=>cols.map(c=>typeof r[c]==='number'&&(/revenue|spending|value|total/i.test(c))?money(r[c]):String(r[c]??'—')))} empty="No report data available yet."/></section></>;}

function SettingsPage(){const [settings,setSettings]=useState<any>({store:{storeName:'Spidy Clothing'},shipping:{charge:79,freeThreshold:1499},contact:{email:'',phone:'',whatsapp:''},social:{instagram:'',facebook:''},policies:{returns:'',privacy:'',terms:''}});const [error,setError]=useState('');const [ok,setOk]=useState(false);useEffect(()=>{adminApi<{settings:any}>('/settings').then(r=>setSettings((v:any)=>({...v,...r.settings}))).catch(e=>setError(e.message));},[]);const change=(section:string,key:string,value:string)=>setSettings((s:any)=>({...s,[section]:{...s[section],[key]:value}}));const save=async()=>{try{await adminApi('/settings',{method:'PUT',body:jsonBody({settings})});setOk(true);setTimeout(()=>setOk(false),2400);}catch(e){setError((e as Error).message);}};return <><PageTitle eyebrow="STORE CONFIGURATION" title="Website settings" description="Edit the store details customers rely on." action={<button className="admin-primary" onClick={save}><Check size={15}/> Save settings</button>}/><ErrorNotice error={error}/>{ok&&<Toast message="Settings saved"/>}<div className="settings-grid"><section className="admin-panel form-section"><h2>Store identity</h2><label>Store name<input value={settings.store.storeName||''} onChange={e=>change('store','storeName',e.target.value)}/></label><label>Store logo URL<input value={settings.store.logoUrl||''} onChange={e=>change('store','logoUrl',e.target.value)} placeholder="/images/brand-logo.svg"/></label><label>Contact email<input value={settings.contact.email||''} onChange={e=>change('contact','email',e.target.value)}/></label><label>Contact phone<input value={settings.contact.phone||''} onChange={e=>change('contact','phone',e.target.value)}/></label><label>WhatsApp number<input value={settings.contact.whatsapp||''} onChange={e=>change('contact','whatsapp',e.target.value)}/></label></section><section className="admin-panel form-section"><h2>Shipping</h2><label>Shipping charge (₹)<input type="number" min="0" value={settings.shipping.charge||0} onChange={e=>change('shipping','charge',e.target.value)}/></label><label>Free shipping threshold (₹)<input type="number" min="0" value={settings.shipping.freeThreshold||0} onChange={e=>change('shipping','freeThreshold',e.target.value)}/></label><h2>Social links</h2><label>Instagram URL<input value={settings.social.instagram||''} onChange={e=>change('social','instagram',e.target.value)}/></label><label>Facebook URL<input value={settings.social.facebook||''} onChange={e=>change('social','facebook',e.target.value)}/></label></section><section className="admin-panel form-section"><h2>Store policies</h2>{[['returns','Return policy'],['privacy','Privacy policy'],['terms','Terms and conditions']].map(([key,label])=><label key={key}>{label}<textarea rows={5} value={settings.policies[key]||''} onChange={e=>change('policies',key,e.target.value)}/></label>)}</section></div></>;}

function Profile(){const [d,setD]=useState<Admin|null>(null);const [name,setName]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [ok,setOk]=useState(false);useEffect(()=>{adminApi<{admin:Admin}>('/profile').then(r=>{setD(r.admin);setName(r.admin.name);}).catch(e=>setError(e.message));},[]);const save=async()=>{try{const r=await adminApi<any>('/profile',{method:'PUT',body:jsonBody({name,password})});setOk(true);if(r.reauthenticate)location.href='/admin';setPassword('');}catch(e){setError((e as Error).message);}};return <><PageTitle eyebrow="YOUR ACCOUNT" title="Admin profile" description="Manage the administrator account used to access the store."/><ErrorNotice error={error}/>{ok&&<Toast message="Profile updated"/>}<section className="admin-panel form-section profile-form"><div className="profile-avatar">{name.slice(0,1).toUpperCase()}</div><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Email address<input value={d?.email||''} disabled/></label><label>Change password<input type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank to keep current password"/><small>Use at least 12 characters. You will sign in again after changing it.</small></label><button className="admin-primary" onClick={save}><Check size={15}/> Save profile</button></section></>;}
