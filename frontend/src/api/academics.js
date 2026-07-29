import { api } from './client';

const RESOURCE_PATHS = {
  academicYears: '/academics/academic-years',
  courses: '/academics/courses',
  classes: '/academics/classes',
  sections: '/academics/sections',
  subjects: '/academics/subjects',
  teacherAllocations: '/academics/teacher-allocations',
};

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

function getPath(resource) {
  const path = RESOURCE_PATHS[resource];
  if (!path) throw new Error(`Unknown academics resource: ${resource}`);
  return path;
}

export async function getCurrentAcademicYear() {
  const data = await api.get('/academics/academic-years/current');
  return data.academicYear;
}

export async function listAcademicResource(resource, params) {
  const path = getPath(resource);
  const data = await api.get(`${path}${queryString(params)}`);
  const keys = {
    academicYears: 'academicYears',
    courses: 'courses',
    classes: 'classes',
    sections: 'sections',
    subjects: 'subjects',
    teacherAllocations: 'teacherAllocations',
  };
  if (resource === 'classes') return data.classes || data.classs || [];
  return data[keys[resource]] || [];
}

export async function createAcademicResource(resource, payload) {
  const path = getPath(resource);
  const data = await api.post(path, payload);
  const keys = {
    academicYears: 'academicYear',
    courses: 'course',
    classes: 'class',
    sections: 'section',
    subjects: 'subject',
    teacherAllocations: 'teacherAllocation',
  };
  return data[keys[resource]];
}

export async function updateAcademicResource(resource, id, payload) {
  const path = getPath(resource);
  const data = await api.patch(`${path}/${id}`, payload);
  const keys = {
    academicYears: 'academicYear',
    courses: 'course',
    classes: 'class',
    sections: 'section',
    subjects: 'subject',
    teacherAllocations: 'teacherAllocation',
  };
  return data[keys[resource]];
}

export async function archiveAcademicResource(resource, id) {
  const path = getPath(resource);
  return api.post(`${path}/${id}/archive`, {});
}

export async function restoreAcademicResource(resource, id) {
  const path = getPath(resource);
  return api.post(`${path}/${id}/restore`, {});
}

export async function setCurrentAcademicYear(id) {
  const data = await api.post(`/academics/academic-years/${id}/set-current`, {});
  return data.academicYear;
}
