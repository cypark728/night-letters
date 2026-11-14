/** Never delete an uploaded photo after an ambiguous save failure. */
export async function saveWithPhotoCleanup<T extends {photo_path:string|null}>(input:T, previousPath:string|null, services:{save:(input:T)=>Promise<void>; remove:(path:string)=>Promise<void>}) {
  await services.save(input)
  if(previousPath && previousPath !== input.photo_path) {
    try { await services.remove(previousPath) } catch { /* Saved reply remains successful; cleanup can be retried later. */ }
  }
}
