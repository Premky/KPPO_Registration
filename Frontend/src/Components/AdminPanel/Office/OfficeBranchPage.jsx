import { Grid } from '@mui/material'
import React from 'react'
import OfficeBranchForm from './OfficeBranchForm'
import BranchForm from './BranchForm'

const OfficeBranchPage = () => {
    return (
        <>
            <Grid container size={{sm:12}} spacing={1}  >
                <Grid size={{xs:12, sm:8}} sx={{padding:0, margin:0}} borderRight={5}>
                    <OfficeBranchForm />
                </Grid>
                <Grid size={{xs:12, sm:4}} sx={{padding:2}} borderLeft={1}>
                    <BranchForm/>
                </Grid>
            </Grid>
        </>
    )
}

export default OfficeBranchPage