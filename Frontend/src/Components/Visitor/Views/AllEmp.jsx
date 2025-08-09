import React from 'react'
import useAllEmployess from '../APIs/useAllEmp'

const AllEmp = () => {
    const {records:allEmps, loading:allEmpsLoading}=useAllEmployess();
  return (
    <div>
        
    </div>
  )
}

export default AllEmp