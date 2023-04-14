<?php
session_start();
include('server_script/config.php');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="A fully featured admin theme which can be used to build CRM, CMS, etc.">
    <meta name="author" content="Coderthemes">

    <link rel="shortcut icon" href="admin/assets/images/favicon.ico">
    <title>ASTU NEWS</title>
    <link href="../plugins/summernote/summernote.css" rel="stylesheet" />
    <link href="../plugins/select2/css/select2.min.css" rel="stylesheet" type="text/css" />
    <link href="../plugins/jquery.filer/css/jquery.filer.css" rel="stylesheet" />
    <link href="../plugins/jquery.filer/css/themes/jquery.filer-dragdropbox-theme.css" rel="stylesheet" />
    <link href="admin/assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/core.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/components.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/icons.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/pages.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/menu.css" rel="stylesheet" type="text/css" />
    <link href="admin/assets/css/responsive.css" rel="stylesheet" type="text/css" />
    <link rel="stylesheet" href="../plugins/switchery/switchery.min.css">
    <script src="admin/assets/js/modernizr.min.js"></script>
    <style>
        .conhead {
            background-color: blueviolet;
        }
    </style>
</head>


<body class="fixed-left">

    <div id="wrapper">
        <div>
            <div class=" conhead">
                <img src="ASTU-300x200.gif" width="100" height="65" /> <span style="margin-top: 25px; color: greenyellow; ">ASTU NEWS</span>
            </div>
        </div>

        <div class="content-page">
            <div class="content">
                <div class="container">

                    <div class="row">
                        <div class="col-md-10 col-md-offset-1">
                            <div class="p-6">
                                <div class="">
                                    <?php
                                    $postid = intval($_GET['pid']);

                                    $query = mysqli_query($con, "select * from tblposts where id='$postid'");
                                    $row = mysqli_fetch_array($query);
                                    ?>
                                    <div class="form-group m-b-20">
                                        <h2 class="m-b-30 m-t-0 header-title" style="font-size: 180%;"><b><?php echo $row['PostTitle'] ?></b></h2>

                                    </div>

                                    <div class="row">
                                        <div class="col-sm-12">
                                            <div class="card-box">
                                                <h2 class="m-b-30 m-t-0 header-title"><b>news</b></h2>
                                                <p class="summernote" style="width:100%; min-height:200px; font-size: 130%;"><?php echo $row['PostDetails'] ?></p>
                                            </div>
                                        </div>
                                    </div>
                                    <a href="index.php" class="btn btn-success waves-effect waves-light">go back</a>
                                </div>
                            </div>
                        </div>
                    </div>



                </div>

            </div>


        </div>

</body>






</html>